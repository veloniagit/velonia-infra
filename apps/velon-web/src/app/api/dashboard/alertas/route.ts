import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import {
  evolutionFetch,
  evolutionInstance,
} from "@/lib/evolution";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ProdutoBaixo = {
  id: bigint;
  codigo_interno: string | null;
  descricao: string;
  estoque: string;
};

type PagamentoPendente = {
  id: bigint;
  valor: string;
  criado_em: Date;
  cliente: string | null;
  proposta: string | null;
};

type PedidoPendente = {
  id: bigint;
  numero: string | null;
  status: string;
  criado_em: Date;
  cliente: string | null;
};

type ConversaParada = {
  contato: string;
  nome_contato: string | null;
  etapa: string;
  atualizado_em: Date;
};

type FalhaWebhook = {
  id: bigint;
  contato: string | null;
  texto: string | null;
  erro: string | null;
  recebido_em: Date;
};

type InstanciaEvolution = {
  name?: string;
  connectionStatus?: string;
};

function numero(valor: string | number | null): number {
  const convertido = Number(valor ?? 0);

  return Number.isFinite(convertido)
    ? convertido
    : 0;
}

function minutosDesde(data: Date): number {
  return Math.max(
    0,
    Math.floor(
      (Date.now() - data.getTime()) / 60000,
    ),
  );
}

export async function GET() {
  try {
    const prisma = getPrisma();

    const [
      produtosBaixos,
      pagamentosPendentes,
      pedidosPendentes,
      conversasParadas,
      falhasWebhook,
    ] = await Promise.all([
      prisma.$queryRaw<ProdutoBaixo[]>`
        SELECT
          id,
          codigo_interno,
          descricao,
          estoque::text
        FROM catalogo.produtos
        WHERE
          status = 'ativo'
          AND estoque <= 5
        ORDER BY estoque ASC, descricao
        LIMIT 10
      `,

      prisma.$queryRaw<PagamentoPendente[]>`
        SELECT
          p.id,
          p.valor::text,
          p.criado_em,
          c.responsavel AS cliente,
          pr.numero AS proposta
        FROM financeiro.pagamentos AS p
        LEFT JOIN crm.clientes AS c
          ON c.id = p.cliente_id
        LEFT JOIN comercial.propostas AS pr
          ON pr.id = p.proposta_id
        WHERE p.status IN (
          'pendente',
          'processando'
        )
        ORDER BY p.criado_em ASC
        LIMIT 10
      `,

      prisma.$queryRaw<PedidoPendente[]>`
        SELECT
          p.id,
          p.numero,
          p.status,
          p.criado_em,
          c.responsavel AS cliente
        FROM comercial.pedidos AS p
        LEFT JOIN crm.clientes AS c
          ON c.id = p.cliente_id
        WHERE p.status IN (
          'pago',
          'em_separacao',
          'separado'
        )
        ORDER BY p.criado_em ASC
        LIMIT 10
      `,

      prisma.$queryRaw<ConversaParada[]>`
        SELECT
          contato,
          nome_contato,
          etapa,
          atualizado_em
        FROM comercial.conversas_ia
        WHERE
          etapa NOT IN (
            'inicio',
            'finalizado',
            'pedido_criado'
          )
          AND atualizado_em <
            NOW() - INTERVAL '30 minutes'
        ORDER BY atualizado_em ASC
        LIMIT 10
      `,

      prisma.$queryRaw<FalhaWebhook[]>`
        SELECT
          id,
          contato,
          texto,
          erro,
          recebido_em
        FROM comercial.eventos_whatsapp
        WHERE
          processado = FALSE
          AND erro IS NOT NULL
        ORDER BY recebido_em DESC
        LIMIT 10
      `,
    ]);

    let whatsapp = {
      conectado: false,
      estado: "offline",
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
        conectado:
          instancia?.connectionStatus === "open",
        estado:
          instancia?.connectionStatus ?? "not_found",
      };
    } catch {
      whatsapp = {
        conectado: false,
        estado: "offline",
      };
    }

    const alertas = [
      ...produtosBaixos.map((produto) => ({
        id: `estoque-${produto.id.toString()}`,
        tipo: "estoque_baixo",
        nivel:
          numero(produto.estoque) <= 1
            ? "critico"
            : "aviso",
        titulo: "Estoque baixo",
        descricao:
          `${produto.descricao} possui ` +
          `${numero(produto.estoque).toLocaleString("pt-BR")} unidade(s).`,
        referencia:
          produto.codigo_interno ?? produto.id.toString(),
        href: "/estoque",
      })),

      ...pagamentosPendentes.map((pagamento) => ({
        id: `pagamento-${pagamento.id.toString()}`,
        tipo: "pagamento_pendente",
        nivel: "aviso",
        titulo: "Pagamento pendente",
        descricao:
          `${pagamento.cliente ?? "Cliente"} · ` +
          `${pagamento.proposta ?? "Sem proposta"} · ` +
          `R$ ${numero(pagamento.valor).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
          })}`,
        referencia: pagamento.id.toString(),
        href: "/financeiro",
      })),

      ...pedidosPendentes.map((pedido) => ({
        id: `pedido-${pedido.id.toString()}`,
        tipo: "pedido_operacional",
        nivel:
          pedido.status === "pago"
            ? "critico"
            : "aviso",
        titulo:
          pedido.status === "pago"
            ? "Pedido aguardando separação"
            : "Pedido em processamento",
        descricao:
          `${pedido.numero ?? `Pedido ${pedido.id}`} · ` +
          `${pedido.cliente ?? "Cliente não identificado"} · ` +
          `${pedido.status}`,
        referencia: pedido.id.toString(),
        href: "/pedidos",
      })),

      ...conversasParadas.map((conversa) => ({
        id: `conversa-${conversa.contato}`,
        tipo: "conversa_parada",
        nivel: "aviso",
        titulo: "Conversa sem avanço",
        descricao:
          `${conversa.nome_contato ?? conversa.contato} está em ` +
          `${conversa.etapa} há ${minutosDesde(
            conversa.atualizado_em,
          )} minutos.`,
        referencia: conversa.contato,
        href: "/conversas",
      })),

      ...falhasWebhook.map((falha) => ({
        id: `webhook-${falha.id.toString()}`,
        tipo: "erro_integracao",
        nivel: "critico",
        titulo: "Falha no atendimento automático",
        descricao:
          `${falha.contato ?? "Contato não identificado"} · ` +
          `${falha.erro ?? "Erro desconhecido"}`,
        referencia: falha.id.toString(),
        href: "/admin/whatsapp",
      })),
    ];

    if (!whatsapp.conectado) {
      alertas.unshift({
        id: "whatsapp-offline",
        tipo: "whatsapp_offline",
        nivel: "critico",
        titulo: "WhatsApp desconectado",
        descricao:
          `A instância ${evolutionInstance} está em estado ${whatsapp.estado}.`,
        referencia: evolutionInstance,
        href: "/admin/whatsapp",
      });
    }

    const resumo = {
      total: alertas.length,
      criticos: alertas.filter(
        (alerta) => alerta.nivel === "critico",
      ).length,
      avisos: alertas.filter(
        (alerta) => alerta.nivel === "aviso",
      ).length,
      estoqueBaixo: produtosBaixos.length,
      pagamentosPendentes:
        pagamentosPendentes.length,
      pedidosOperacionais:
        pedidosPendentes.length,
      conversasParadas:
        conversasParadas.length,
      falhasIntegracao:
        falhasWebhook.length,
    };

    return NextResponse.json({
      status: "ok",
      atualizadoEm: new Date().toISOString(),
      resumo,
      whatsapp,
      alertas,
    });
  } catch (error) {
    console.error(
      "Erro na API de alertas do Dashboard:",
      error,
    );

    return NextResponse.json(
      {
        status: "erro",
        mensagem:
          "Não foi possível carregar os alertas executivos.",
        detalhe:
          error instanceof Error
            ? error.message
            : "Erro desconhecido.",
      },
      { status: 500 },
    );
  }
}
