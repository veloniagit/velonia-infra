import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import {
  evolutionFetch,
  evolutionInstance,
} from "@/lib/evolution";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ResumoBanco = {
  clientes_total: number;
  clientes_ativos: number;
  clientes_hoje: number;

  produtos_total: number;
  produtos_ativos: number;
  estoque_total: string;
  produtos_estoque_baixo: number;

  conversas_total: number;
  conversas_hoje: number;
  conversas_em_atendimento: number;

  orcamentos_total: number;
  orcamentos_hoje: number;
  valor_orcamentos_hoje: string;

  pedidos_total: number;
  pedidos_hoje: number;
  pedidos_pagos: number;
  pedidos_separacao: number;
  pedidos_enviados: number;

  pagamentos_pendentes: number;
  pagamentos_pagos_hoje: number;
  faturamento_hoje: string;
  faturamento_total: string;
};

type InstanciaEvolution = {
  name?: string;
  connectionStatus?: string;
  ownerJid?: string | null;
  profileName?: string | null;
  number?: string | null;
  updatedAt?: string | null;
  _count?: {
    Message?: number;
    Contact?: number;
    Chat?: number;
  };
};

function numero(valor: string | number | null): number {
  const convertido = Number(valor ?? 0);

  return Number.isFinite(convertido)
    ? convertido
    : 0;
}

export async function GET() {
  try {
    const prisma = getPrisma();

    const resultados = await prisma.$queryRaw<ResumoBanco[]>`
      SELECT
        (
          SELECT COUNT(*)::int
          FROM crm.clientes
        ) AS clientes_total,

        (
          SELECT COUNT(*)::int
          FROM crm.clientes
          WHERE status = 'ativo'
        ) AS clientes_ativos,

        (
          SELECT COUNT(*)::int
          FROM crm.clientes
          WHERE
            (criado_em AT TIME ZONE 'America/Sao_Paulo')::date =
            (NOW() AT TIME ZONE 'America/Sao_Paulo')::date
        ) AS clientes_hoje,

        (
          SELECT COUNT(*)::int
          FROM catalogo.produtos
        ) AS produtos_total,

        (
          SELECT COUNT(*)::int
          FROM catalogo.produtos
          WHERE status = 'ativo'
        ) AS produtos_ativos,

        (
          SELECT COALESCE(SUM(estoque), 0)::text
          FROM catalogo.produtos
          WHERE status = 'ativo'
        ) AS estoque_total,

        (
          SELECT COUNT(*)::int
          FROM catalogo.produtos
          WHERE
            status = 'ativo'
            AND estoque <= 5
        ) AS produtos_estoque_baixo,

        (
          SELECT COUNT(*)::int
          FROM comercial.conversas_ia
        ) AS conversas_total,

        (
          SELECT COUNT(*)::int
          FROM comercial.conversas_ia
          WHERE
            (atualizado_em AT TIME ZONE 'America/Sao_Paulo')::date =
            (NOW() AT TIME ZONE 'America/Sao_Paulo')::date
        ) AS conversas_hoje,

        (
          SELECT COUNT(*)::int
          FROM comercial.conversas_ia
          WHERE etapa NOT IN ('inicio', 'finalizado')
        ) AS conversas_em_atendimento,

        (
          SELECT COUNT(*)::int
          FROM comercial.propostas
        ) AS orcamentos_total,

        (
          SELECT COUNT(*)::int
          FROM comercial.propostas
          WHERE
            (criado_em AT TIME ZONE 'America/Sao_Paulo')::date =
            (NOW() AT TIME ZONE 'America/Sao_Paulo')::date
        ) AS orcamentos_hoje,

        (
          SELECT COALESCE(SUM(valor_total), 0)::text
          FROM comercial.propostas
          WHERE
            (criado_em AT TIME ZONE 'America/Sao_Paulo')::date =
            (NOW() AT TIME ZONE 'America/Sao_Paulo')::date
        ) AS valor_orcamentos_hoje,

        (
          SELECT COUNT(*)::int
          FROM comercial.pedidos
        ) AS pedidos_total,

        (
          SELECT COUNT(*)::int
          FROM comercial.pedidos
          WHERE
            (criado_em AT TIME ZONE 'America/Sao_Paulo')::date =
            (NOW() AT TIME ZONE 'America/Sao_Paulo')::date
        ) AS pedidos_hoje,

        (
          SELECT COUNT(*)::int
          FROM comercial.pedidos
          WHERE status = 'pago'
        ) AS pedidos_pagos,

        (
          SELECT COUNT(*)::int
          FROM comercial.pedidos
          WHERE status IN (
            'em_separacao',
            'separado'
          )
        ) AS pedidos_separacao,

        (
          SELECT COUNT(*)::int
          FROM comercial.pedidos
          WHERE status = 'enviado'
        ) AS pedidos_enviados,

        (
          SELECT COUNT(*)::int
          FROM financeiro.pagamentos
          WHERE status IN ('pendente', 'processando')
        ) AS pagamentos_pendentes,

        (
          SELECT COUNT(*)::int
          FROM financeiro.pagamentos
          WHERE
            status = 'pago'
            AND
            (pago_em AT TIME ZONE 'America/Sao_Paulo')::date =
            (NOW() AT TIME ZONE 'America/Sao_Paulo')::date
        ) AS pagamentos_pagos_hoje,

        (
          SELECT COALESCE(SUM(valor), 0)::text
          FROM financeiro.pagamentos
          WHERE
            status = 'pago'
            AND
            (pago_em AT TIME ZONE 'America/Sao_Paulo')::date =
            (NOW() AT TIME ZONE 'America/Sao_Paulo')::date
        ) AS faturamento_hoje,

        (
          SELECT COALESCE(SUM(valor), 0)::text
          FROM financeiro.pagamentos
          WHERE status = 'pago'
        ) AS faturamento_total
    `;

    const resumo = resultados[0];

    if (!resumo) {
      throw new Error(
        "O banco não retornou o resumo executivo.",
      );
    }

    let whatsapp = {
      evolutionOnline: false,
      conectado: false,
      instancia: evolutionInstance,
      connectionStatus: "offline",
      profileName: null as string | null,
      ownerJid: null as string | null,
      numero: null as string | null,
      atualizadoEm: null as string | null,
      mensagens: 0,
      contatos: 0,
      conversas: 0,
    };

    try {
      const instancias =
        await evolutionFetch<InstanciaEvolution[]>(
          "/instance/fetchInstances",
        );

      const instancia = instancias.find(
        (item) => item.name === evolutionInstance,
      );

      whatsapp = {
        evolutionOnline: true,
        conectado:
          instancia?.connectionStatus === "open",
        instancia:
          instancia?.name ?? evolutionInstance,
        connectionStatus:
          instancia?.connectionStatus ?? "not_found",
        profileName:
          instancia?.profileName ?? null,
        ownerJid:
          instancia?.ownerJid ?? null,
        numero:
          instancia?.number ?? null,
        atualizadoEm:
          instancia?.updatedAt ?? null,
        mensagens:
          instancia?._count?.Message ?? 0,
        contatos:
          instancia?._count?.Contact ?? 0,
        conversas:
          instancia?._count?.Chat ?? 0,
      };
    } catch (error) {
      console.error(
        "Evolution indisponível no Dashboard:",
        error,
      );
    }

    return NextResponse.json({
      status: "ok",
      atualizadoEm: new Date().toISOString(),

      clientes: {
        total: resumo.clientes_total,
        ativos: resumo.clientes_ativos,
        novosHoje: resumo.clientes_hoje,
      },

      produtos: {
        total: resumo.produtos_total,
        ativos: resumo.produtos_ativos,
        estoqueTotal: numero(resumo.estoque_total),
        estoqueBaixo:
          resumo.produtos_estoque_baixo,
      },

      conversas: {
        total: resumo.conversas_total,
        hoje: resumo.conversas_hoje,
        emAtendimento:
          resumo.conversas_em_atendimento,
      },

      orcamentos: {
        total: resumo.orcamentos_total,
        hoje: resumo.orcamentos_hoje,
        valorHoje:
          numero(resumo.valor_orcamentos_hoje),
      },

      pedidos: {
        total: resumo.pedidos_total,
        hoje: resumo.pedidos_hoje,
        pagos: resumo.pedidos_pagos,
        emSeparacao: resumo.pedidos_separacao,
        enviados: resumo.pedidos_enviados,
      },

      financeiro: {
        pagamentosPendentes:
          resumo.pagamentos_pendentes,
        pagamentosPagosHoje:
          resumo.pagamentos_pagos_hoje,
        faturamentoHoje:
          numero(resumo.faturamento_hoje),
        faturamentoTotal:
          numero(resumo.faturamento_total),
      },

      whatsapp,

      ia: {
        status: "operacional",
        consultorOnline: true,
        memoriaConversacional: true,
        buscaProdutos: true,
        geracaoOrcamentos: true,
        fluxoPedidos: true,
      },
    });
  } catch (error) {
    console.error(
      "Erro ao gerar resumo do Dashboard:",
      error,
    );

    return NextResponse.json(
      {
        status: "erro",
        mensagem:
          "Não foi possível carregar o resumo executivo.",
        detalhe:
          error instanceof Error
            ? error.message
            : "Erro desconhecido.",
      },
      { status: 500 },
    );
  }
}
