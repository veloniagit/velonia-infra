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
  modalidade_entrega: string | null;
  transportadora: string | null;
  codigo_rastreio: string | null;
  local_retirada: string | null;
};

type CorpoRequisicao = {
  modalidade?: string;
  transportadora?: string;
  codigoRastreio?: string;
  localRetirada?: string;
};

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;

    if (!/^\d+$/.test(id)) {
      return NextResponse.json(
        {
          status: "erro",
          mensagem: "ID do pedido inválido.",
        },
        { status: 400 },
      );
    }

    let corpo: CorpoRequisicao;

    try {
      corpo = (await request.json()) as CorpoRequisicao;
    } catch {
      return NextResponse.json(
        {
          status: "erro",
          mensagem: "Envie um JSON válido.",
        },
        { status: 400 },
      );
    }

    const modalidade =
      corpo.modalidade?.trim().toLowerCase() ?? "";

    if (
      modalidade !== "entrega" &&
      modalidade !== "retirada"
    ) {
      return NextResponse.json(
        {
          status: "erro",
          mensagem:
            "Modalidade inválida. Escolha entrega ou retirada.",
        },
        { status: 400 },
      );
    }

    const transportadora =
      corpo.transportadora?.trim() || null;

    const codigoRastreio =
      corpo.codigoRastreio?.trim() || null;

    const localRetirada =
      corpo.localRetirada?.trim() || null;

    if (modalidade === "entrega" && !transportadora) {
      return NextResponse.json(
        {
          status: "erro",
          mensagem:
            "Informe a transportadora para realizar a entrega.",
        },
        { status: 400 },
      );
    }

    if (modalidade === "retirada" && !localRetirada) {
      return NextResponse.json(
        {
          status: "erro",
          mensagem:
            "Informe o local onde o cliente deverá retirar o pedido.",
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
            status,
            modalidade_entrega,
            transportadora,
            codigo_rastreio,
            local_retirada
          FROM comercial.pedidos
          WHERE id = ${pedidoId}
          FOR UPDATE
        `;

        const pedido = pedidos[0];

        if (!pedido) {
          throw new Error("PEDIDO_NAO_ENCONTRADO");
        }

        if (
          pedido.status === "enviado" ||
          pedido.status === "disponivel_retirada" ||
          pedido.status === "concluido"
        ) {
          return {
            pedido,
            jaProcessado: true,
            modalidade:
              pedido.modalidade_entrega ?? modalidade,
            resposta:
              pedido.status === "enviado"
                ? `O pedido ${pedido.numero} já foi enviado.`
                : `O pedido ${pedido.numero} já está disponível para retirada.`,
          };
        }

        if (pedido.status !== "separado") {
          throw new Error(
            `STATUS_PEDIDO_INVALIDO:${pedido.status}`,
          );
        }

        const numeroPedido =
          pedido.numero ?? pedido.id.toString();

        if (modalidade === "entrega") {
          const resposta =
            `Seu pedido ${numeroPedido} foi enviado. ` +
            `Transportadora: ${transportadora}.` +
            (codigoRastreio
              ? ` Código de rastreio: ${codigoRastreio}.`
              : "");

          await tx.$executeRaw`
            UPDATE comercial.pedidos
            SET
              modalidade_entrega = 'entrega',
              transportadora = ${transportadora},
              codigo_rastreio = ${codigoRastreio},
              status = 'enviado',
              enviado_em = NOW(),
              atualizado_em = NOW()
            WHERE id = ${pedido.id}
          `;

          await tx.$executeRaw`
            UPDATE comercial.conversas_ia
            SET
              etapa = 'pedido_enviado',
              ultima_resposta_ia = ${resposta},
              contexto =
                COALESCE(contexto, '{}'::jsonb) ||
                jsonb_build_object(
                  'pedidoId',
                  ${pedido.id.toString()}::text,
                  'pedidoNumero',
                  ${numeroPedido}::text,
                  'pedidoStatus',
                  'enviado',
                  'modalidadeEntrega',
                  'entrega',
                  'transportadora',
                  ${transportadora}::text,
                  'codigoRastreio',
                  ${codigoRastreio ?? ""}::text
                ),
              atualizado_em = NOW()
            WHERE empresa_id = ${pedido.empresa_id}
              AND cliente_id = ${pedido.cliente_id}
          `;

          return {
            pedido,
            jaProcessado: false,
            modalidade,
            resposta,
          };
        }

        const resposta =
          `Seu pedido ${numeroPedido} está disponível para retirada. ` +
          `Local: ${localRetirada}.`;

        await tx.$executeRaw`
          UPDATE comercial.pedidos
          SET
            modalidade_entrega = 'retirada',
            local_retirada = ${localRetirada},
            status = 'disponivel_retirada',
            disponivel_retirada_em = NOW(),
            atualizado_em = NOW()
          WHERE id = ${pedido.id}
        `;

        await tx.$executeRaw`
          UPDATE comercial.conversas_ia
          SET
            etapa = 'disponivel_retirada',
            ultima_resposta_ia = ${resposta},
            contexto =
              COALESCE(contexto, '{}'::jsonb) ||
              jsonb_build_object(
                'pedidoId',
                ${pedido.id.toString()}::text,
                'pedidoNumero',
                ${numeroPedido}::text,
                'pedidoStatus',
                'disponivel_retirada',
                'modalidadeEntrega',
                'retirada',
                'localRetirada',
                ${localRetirada}::text
              ),
            atualizado_em = NOW()
          WHERE empresa_id = ${pedido.empresa_id}
            AND cliente_id = ${pedido.cliente_id}
        `;

        return {
          pedido,
          jaProcessado: false,
          modalidade,
          resposta,
        };
      },
    );

    const novoStatus =
      resultado.modalidade === "entrega"
        ? "enviado"
        : "disponivel_retirada";

    return NextResponse.json({
      status: "ok",
      expedicaoRegistrada: true,
      jaProcessado: resultado.jaProcessado,
      pedido: {
        id: resultado.pedido.id.toString(),
        numero: resultado.pedido.numero,
        modalidade: resultado.modalidade,
        status: novoStatus,
      },
      transportadora:
        resultado.modalidade === "entrega"
          ? transportadora
          : null,
      codigoRastreio:
        resultado.modalidade === "entrega"
          ? codigoRastreio
          : null,
      localRetirada:
        resultado.modalidade === "retirada"
          ? localRetirada
          : null,
      resposta: resultado.resposta,
      proximaAcao:
        resultado.modalidade === "entrega"
          ? "acompanhar_entrega"
          : "aguardar_retirada",
    });
  } catch (error) {
    console.error(
      "Erro ao registrar expedição do pedido:",
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

    if (detalhe.startsWith("STATUS_PEDIDO_INVALIDO:")) {
      const statusAtual = detalhe.split(":")[1];

      return NextResponse.json(
        {
          status: "erro",
          mensagem:
            `O pedido não pode ser expedido enquanto estiver com status ${statusAtual}.`,
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        status: "erro",
        mensagem:
          "Não foi possível registrar a expedição.",
        detalhe,
      },
      { status: 500 },
    );
  }
}
