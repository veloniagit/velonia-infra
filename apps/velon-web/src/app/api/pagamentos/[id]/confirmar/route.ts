import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type PagamentoBanco = {
  id: bigint;
  empresa_id: bigint;
  cliente_id: bigint | null;
  proposta_id: bigint | null;
  pedido_id: bigint | null;
  forma_pagamento: string;
  valor: string;
  status: string;
  txid: string | null;
};

type PedidoBanco = {
  id: bigint;
  numero: string | null;
  valor_total: string;
  status: string;
};

export async function POST(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;

    if (!/^\d+$/.test(id)) {
      return NextResponse.json(
        {
          status: "erro",
          mensagem: "ID de pagamento inválido.",
        },
        { status: 400 },
      );
    }

    const pagamentoId = BigInt(id);
    const prisma = getPrisma();

    const resultado = await prisma.$transaction(
      async (tx) => {
        const pagamentos =
          await tx.$queryRaw<PagamentoBanco[]>`
            SELECT
              id,
              empresa_id,
              cliente_id,
              proposta_id,
              pedido_id,
              forma_pagamento,
              valor::text,
              status,
              txid
            FROM financeiro.pagamentos
            WHERE id = ${pagamentoId}
            FOR UPDATE
          `;

        const pagamento = pagamentos[0];

        if (!pagamento) {
          throw new Error("PAGAMENTO_NAO_ENCONTRADO");
        }

        if (!pagamento.cliente_id) {
          throw new Error("PAGAMENTO_SEM_CLIENTE");
        }

        if (!pagamento.proposta_id) {
          throw new Error("PAGAMENTO_SEM_PROPOSTA");
        }

        const pedidosExistentes =
          await tx.$queryRaw<PedidoBanco[]>`
            SELECT
              id,
              numero,
              valor_total::text,
              status
            FROM comercial.pedidos
            WHERE pagamento_id = ${pagamento.id}
            LIMIT 1
          `;

        const pedidoExistente = pedidosExistentes[0];

        if (pedidoExistente) {
          return {
            pagamento,
            pedido: pedidoExistente,
            pedidoCriado: false,
          };
        }

        if (
          pagamento.status !== "pendente" &&
          pagamento.status !== "processando"
        ) {
          if (pagamento.status !== "pago") {
            throw new Error(
              `STATUS_PAGAMENTO_INVALIDO:${pagamento.status}`,
            );
          }
        }

        await tx.$executeRaw`
          UPDATE financeiro.pagamentos
          SET
            status = 'pago',
            pago_em = COALESCE(pago_em, NOW()),
            atualizado_em = NOW()
          WHERE id = ${pagamento.id}
        `;

        await tx.$executeRaw`
          UPDATE comercial.propostas
          SET
            status = 'aprovada',
            aprovada_em = COALESCE(aprovada_em, NOW()),
            atualizado_em = NOW()
          WHERE id = ${pagamento.proposta_id}
        `;

        const pedidosCriados =
          await tx.$queryRaw<Array<{ id: bigint }>>`
            INSERT INTO comercial.pedidos (
              empresa_id,
              cliente_id,
              proposta_id,
              pagamento_id,
              valor_total,
              status,
              forma_pagamento,
              cep,
              endereco,
              numero_endereco,
              complemento,
              bairro,
              cidade,
              estado,
              observacoes,
              pago_em,
              criado_em,
              atualizado_em
            )
            SELECT
              ${pagamento.empresa_id},
              c.id,
              ${pagamento.proposta_id},
              ${pagamento.id},
              ${Number(pagamento.valor)},
              'pago',
              ${pagamento.forma_pagamento},
              c.cep,
              c.endereco,
              c.numero,
              c.complemento,
              c.bairro,
              c.cidade,
              c.estado,
              'Pedido criado automaticamente após confirmação do pagamento.',
              NOW(),
              NOW(),
              NOW()
            FROM crm.clientes AS c
            WHERE c.id = ${pagamento.cliente_id}
            RETURNING id
          `;

        const pedidoId = pedidosCriados[0]?.id;

        if (!pedidoId) {
          throw new Error("PEDIDO_NAO_CRIADO");
        }

        const numero =
          `PED-${pedidoId
            .toString()
            .padStart(6, "0")}`;

        await tx.$executeRaw`
          UPDATE comercial.pedidos
          SET
            numero = ${numero},
            atualizado_em = NOW()
          WHERE id = ${pedidoId}
        `;

        await tx.$executeRaw`
          INSERT INTO comercial.pedido_itens (
            pedido_id,
            produto_id,
            codigo_produto,
            descricao,
            quantidade,
            valor_unitario,
            desconto,
            valor_total,
            status,
            criado_em,
            atualizado_em
          )
          SELECT
            ${pedidoId},
            produto_id,
            codigo_produto,
            descricao,
            quantidade,
            valor_unitario,
            desconto,
            valor_total,
            'aguardando_separacao',
            NOW(),
            NOW()
          FROM comercial.proposta_itens
          WHERE proposta_id = ${pagamento.proposta_id}
        `;

        await tx.$executeRaw`
          UPDATE financeiro.pagamentos
          SET
            pedido_id = ${pedidoId},
            atualizado_em = NOW()
          WHERE id = ${pagamento.id}
        `;

        const resposta =
          `Pagamento confirmado. Seu pedido ${numero} ` +
          `foi criado e será encaminhado para separação.`;

        await tx.$executeRaw`
          UPDATE comercial.conversas_ia
          SET
            etapa = 'pagamento_confirmado',
            ultima_resposta_ia = ${resposta},
            contexto =
              COALESCE(contexto, '{}'::jsonb) ||
              jsonb_build_object(
                'pagamentoId',
                ${pagamento.id.toString()}::text,
                'pedidoId',
                ${pedidoId.toString()}::text,
                'pedidoNumero',
                ${numero}::text
              ),
            atualizado_em = NOW()
          WHERE empresa_id = ${pagamento.empresa_id}
            AND cliente_id = ${pagamento.cliente_id}
            AND ultima_proposta_id =
              ${pagamento.proposta_id}
        `;

        return {
          pagamento,
          pedido: {
            id: pedidoId,
            numero,
            valor_total: pagamento.valor,
            status: "pago",
          },
          pedidoCriado: true,
          resposta,
        };
      },
    );

    return NextResponse.json({
      status: "ok",
      pagamentoConfirmado: true,
      pedidoCriado: resultado.pedidoCriado,
      pagamento: {
        id: resultado.pagamento.id.toString(),
        txid: resultado.pagamento.txid,
        status: "pago",
        valor: Number(resultado.pagamento.valor),
      },
      pedido: {
        id: resultado.pedido.id.toString(),
        numero: resultado.pedido.numero,
        valorTotal: Number(resultado.pedido.valor_total),
        status: resultado.pedido.status,
      },
      etapa: "pagamento_confirmado",
      resposta:
        "resposta" in resultado
          ? resultado.resposta
          : `O pagamento já estava confirmado e o pedido ${resultado.pedido.numero} já existe.`,
      proximaAcao: "iniciar_separacao",
    });
  } catch (error) {
    console.error(
      "Erro ao confirmar pagamento e criar pedido:",
      error,
    );

    const mensagem =
      error instanceof Error
        ? error.message
        : "ERRO_DESCONHECIDO";

    if (mensagem === "PAGAMENTO_NAO_ENCONTRADO") {
      return NextResponse.json(
        {
          status: "erro",
          mensagem: "Pagamento não encontrado.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        status: "erro",
        mensagem:
          "Não foi possível confirmar o pagamento e criar o pedido.",
        detalhe: mensagem,
      },
      { status: 500 },
    );
  }
}
