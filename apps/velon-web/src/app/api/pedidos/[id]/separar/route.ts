import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type PedidoBanco = {
  id: bigint;
  empresa_id: bigint;
  cliente_id: bigint | null;
  numero: string | null;
  status: string;
};

type ItemBanco = {
  id: bigint;
  produto_id: bigint | null;
  descricao: string;
  quantidade: string;
  status: string;
  estoque: string | null;
  permite_venda_sem_estoque: boolean | null;
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
          mensagem: "ID de pedido inválido.",
        },
        { status: 400 },
      );
    }

    const pedidoId = BigInt(id);
    const prisma = getPrisma();

    const resultado = await prisma.$transaction(
      async (tx) => {
        const pedidos = await tx.$queryRaw<PedidoBanco[]>`
          SELECT
            id,
            empresa_id,
            cliente_id,
            numero,
            status
          FROM comercial.pedidos
          WHERE id = ${pedidoId}
          FOR UPDATE
        `;

        const pedido = pedidos[0];

        if (!pedido) {
          throw new Error("PEDIDO_NAO_ENCONTRADO");
        }

        if (
          pedido.status === "separado" ||
          pedido.status === "enviado" ||
          pedido.status === "concluido"
        ) {
          return {
            pedido,
            jaSeparado: true,
            itensSeparados: 0,
          };
        }

        if (
          pedido.status !== "pago" &&
          pedido.status !== "em_separacao"
        ) {
          throw new Error(
            `STATUS_PEDIDO_INVALIDO:${pedido.status}`,
          );
        }

        const itens = await tx.$queryRaw<ItemBanco[]>`
          SELECT
            pi.id,
            pi.produto_id,
            pi.descricao,
            pi.quantidade::text,
            pi.status,
            p.estoque::text,
            p.permite_venda_sem_estoque
          FROM comercial.pedido_itens AS pi
          LEFT JOIN catalogo.produtos AS p
            ON p.id = pi.produto_id
          WHERE pi.pedido_id = ${pedido.id}
          ORDER BY pi.id
          FOR UPDATE OF pi
        `;

        if (itens.length === 0) {
          throw new Error("PEDIDO_SEM_ITENS");
        }

        await tx.$executeRaw`
          UPDATE comercial.pedidos
          SET
            status = 'em_separacao',
            atualizado_em = NOW()
          WHERE id = ${pedido.id}
        `;

        for (const item of itens) {
          if (!item.produto_id) {
            throw new Error(
              `ITEM_SEM_PRODUTO:${item.id.toString()}`,
            );
          }

          if (item.status === "separado") {
            continue;
          }

          const quantidade = Number(item.quantidade);
          const estoqueAnterior = Number(item.estoque ?? 0);

          if (
            !Number.isFinite(quantidade) ||
            quantidade <= 0
          ) {
            throw new Error(
              `QUANTIDADE_INVALIDA:${item.id.toString()}`,
            );
          }

          if (
            !item.permite_venda_sem_estoque &&
            estoqueAnterior < quantidade
          ) {
            throw new Error(
              `ESTOQUE_INSUFICIENTE:${item.descricao}:` +
              `${estoqueAnterior}`,
            );
          }

          const estoquePosterior = Math.max(
            0,
            estoqueAnterior - quantidade,
          );

          await tx.$executeRaw`
            UPDATE catalogo.produtos
            SET
              estoque = ${estoquePosterior},
              atualizado_em = NOW()
            WHERE id = ${item.produto_id}
          `;

          await tx.$executeRaw`
            INSERT INTO catalogo.movimentacoes_estoque (
              empresa_id,
              produto_id,
              pedido_id,
              tipo,
              quantidade,
              estoque_anterior,
              estoque_posterior,
              referencia,
              observacoes,
              criado_em
            )
            VALUES (
              ${pedido.empresa_id},
              ${item.produto_id},
              ${pedido.id},
              'saida_venda',
              ${quantidade},
              ${estoqueAnterior},
              ${estoquePosterior},
              ${pedido.numero ?? pedido.id.toString()},
              'Baixa automática após separação do pedido.',
              NOW()
            )
          `;

          await tx.$executeRaw`
            UPDATE comercial.pedido_itens
            SET
              status = 'separado',
              separado_em = NOW(),
              atualizado_em = NOW()
            WHERE id = ${item.id}
          `;
        }

        await tx.$executeRaw`
          UPDATE comercial.pedidos
          SET
            status = 'separado',
            separado_em = NOW(),
            atualizado_em = NOW()
          WHERE id = ${pedido.id}
        `;

        const resposta =
          `O pedido ${
            pedido.numero ?? pedido.id.toString()
          } foi separado com sucesso.`;

        await tx.$executeRaw`
          UPDATE comercial.conversas_ia
          SET
            etapa = 'pedido_criado',
            ultima_resposta_ia = ${resposta},
            contexto =
              COALESCE(contexto, '{}'::jsonb) ||
              jsonb_build_object(
                'pedidoId',
                ${pedido.id.toString()}::text,
                'pedidoNumero',
                ${pedido.numero ?? ""}::text,
                'pedidoStatus',
                'separado'
              ),
            atualizado_em = NOW()
          WHERE empresa_id = ${pedido.empresa_id}
            AND cliente_id = ${pedido.cliente_id}
        `;

        return {
          pedido,
          jaSeparado: false,
          itensSeparados: itens.filter(
            (item) => item.status !== "separado",
          ).length,
          resposta,
        };
      },
    );

    return NextResponse.json({
      status: "ok",
      pedidoSeparado: true,
      jaSeparado: resultado.jaSeparado,
      pedido: {
        id: resultado.pedido.id.toString(),
        numero: resultado.pedido.numero,
        status: "separado",
      },
      itensSeparados: resultado.itensSeparados,
      etapa: "pedido_criado",
      resposta:
        "resposta" in resultado
          ? resultado.resposta
          : `O pedido ${resultado.pedido.numero} já estava separado.`,
      proximaAcao: "preparar_envio",
    });
  } catch (error) {
    console.error(
      "Erro ao separar pedido e baixar estoque:",
      error,
    );

    const detalhe =
      error instanceof Error
        ? error.message
        : "ERRO_DESCONHECIDO";

    if (detalhe === "PEDIDO_NAO_ENCONTRADO") {
      return NextResponse.json(
        {
          status: "erro",
          mensagem: "Pedido não encontrado.",
        },
        { status: 404 },
      );
    }

    if (detalhe.startsWith("ESTOQUE_INSUFICIENTE:")) {
      const [, produto, estoque] = detalhe.split(":");

      return NextResponse.json(
        {
          status: "erro",
          mensagem:
            `Estoque insuficiente para ${produto}. ` +
            `Disponível: ${estoque}.`,
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        status: "erro",
        mensagem:
          "Não foi possível separar o pedido.",
        detalhe,
      },
      { status: 500 },
    );
  }
}
