import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SerieDiariaBanco = {
  data: Date;
  orcamentos: number;
  pedidos: number;
  pagamentos: number;
  faturamento: string;
};

type FunilBanco = {
  conversas: number;
  orcamentos: number;
  pedidos: number;
  pagamentos: number;
  faturamento_total: string;
};

function numero(
  valor: string | number | null | undefined,
): number {
  const convertido = Number(valor ?? 0);

  return Number.isFinite(convertido)
    ? convertido
    : 0;
}

function percentual(
  parte: number,
  total: number,
): number {
  if (total <= 0) {
    return 0;
  }

  return Number(
    ((parte / total) * 100).toFixed(2),
  );
}

function formatarData(data: Date): string {
  const dataUtc = new Date(
    data.getUTCFullYear(),
    data.getUTCMonth(),
    data.getUTCDate(),
    12,
  );

  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(dataUtc);
}

export async function GET() {
  try {
    const prisma = getPrisma();

    const serie =
      await prisma.$queryRaw<SerieDiariaBanco[]>`
        WITH dias AS (
          SELECT generate_series(
            (
              NOW()
              AT TIME ZONE 'America/Sao_Paulo'
            )::date - INTERVAL '6 days',
            (
              NOW()
              AT TIME ZONE 'America/Sao_Paulo'
            )::date,
            INTERVAL '1 day'
          )::date AS data
        )

        SELECT
          dias.data,

          (
            SELECT COUNT(*)::int
            FROM comercial.propostas AS proposta
            WHERE
              (
                proposta.criado_em
                AT TIME ZONE 'America/Sao_Paulo'
              )::date = dias.data
          ) AS orcamentos,

          (
            SELECT COUNT(*)::int
            FROM comercial.pedidos AS pedido
            WHERE
              (
                pedido.criado_em
                AT TIME ZONE 'America/Sao_Paulo'
              )::date = dias.data
          ) AS pedidos,

          (
            SELECT COUNT(*)::int
            FROM financeiro.pagamentos AS pagamento
            WHERE
              pagamento.status = 'pago'
              AND (
                pagamento.pago_em
                AT TIME ZONE 'America/Sao_Paulo'
              )::date = dias.data
          ) AS pagamentos,

          (
            SELECT COALESCE(
              SUM(pagamento.valor),
              0
            )::text
            FROM financeiro.pagamentos AS pagamento
            WHERE
              pagamento.status = 'pago'
              AND (
                pagamento.pago_em
                AT TIME ZONE 'America/Sao_Paulo'
              )::date = dias.data
          ) AS faturamento

        FROM dias
        ORDER BY dias.data
      `;

    const funilResultados =
      await prisma.$queryRaw<FunilBanco[]>`
        SELECT
          (
            SELECT COUNT(*)::int
            FROM comercial.conversas_ia
          ) AS conversas,

          (
            SELECT COUNT(*)::int
            FROM comercial.propostas
          ) AS orcamentos,

          (
            SELECT COUNT(*)::int
            FROM comercial.pedidos
          ) AS pedidos,

          (
            SELECT COUNT(*)::int
            FROM financeiro.pagamentos
            WHERE status = 'pago'
          ) AS pagamentos,

          (
            SELECT COALESCE(
              SUM(valor),
              0
            )::text
            FROM financeiro.pagamentos
            WHERE status = 'pago'
          ) AS faturamento_total
      `;

    const funil = funilResultados[0];

    if (!funil) {
      throw new Error(
        "Não foi possível montar o funil comercial.",
      );
    }

    const conversas = numero(funil.conversas);
    const orcamentos = numero(funil.orcamentos);
    const pedidos = numero(funil.pedidos);
    const pagamentos = numero(funil.pagamentos);
    const faturamentoTotal =
      numero(funil.faturamento_total);

    const ticketMedio =
      pagamentos > 0
        ? faturamentoTotal / pagamentos
        : 0;

    return NextResponse.json({
      status: "ok",
      atualizadoEm: new Date().toISOString(),

      periodo: {
        dias: 7,
        inicio:
          serie[0]?.data.toISOString() ?? null,
        fim:
          serie.at(-1)?.data.toISOString() ??
          null,
      },

      serie: serie.map((item) => ({
        data: item.data.toISOString(),
        rotulo: formatarData(item.data),
        orcamentos: numero(item.orcamentos),
        pedidos: numero(item.pedidos),
        pagamentos: numero(item.pagamentos),
        faturamento:
          numero(item.faturamento),
      })),

      funil: {
        conversas,
        orcamentos,
        pedidos,
        pagamentos,

        conversaoConversaOrcamento:
          percentual(
            orcamentos,
            conversas,
          ),

        conversaoOrcamentoPedido:
          percentual(
            pedidos,
            orcamentos,
          ),

        conversaoPedidoPagamento:
          percentual(
            pagamentos,
            pedidos,
          ),

        conversaoGeral:
          percentual(
            pagamentos,
            conversas,
          ),
      },

      financeiro: {
        faturamentoTotal,
        ticketMedio:
          Number(ticketMedio.toFixed(2)),
      },
    });
  } catch (error) {
    console.error(
      "Erro na API de gráficos do Dashboard:",
      error,
    );

    return NextResponse.json(
      {
        status: "erro",
        mensagem:
          "Não foi possível carregar os gráficos executivos.",
        detalhe:
          error instanceof Error
            ? error.message
            : "Erro desconhecido.",
      },
      { status: 500 },
    );
  }
}
