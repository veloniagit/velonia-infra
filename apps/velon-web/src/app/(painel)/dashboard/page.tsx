import Link from "next/link";
import GraficosExecutivos from "@/components/dashboard/GraficosExecutivos";
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
  profileName?: string | null;
  ownerJid?: string | null;
  updatedAt?: string | null;
  _count?: {
    Message?: number;
    Contact?: number;
    Chat?: number;
  };
};

type PedidoRecente = {
  id: bigint;
  numero: string | null;
  cliente: string | null;
  valor_total: string;
  status: string;
  criado_em: Date;
};

function numero(valor: string | number | null): number {
  const convertido = Number(valor ?? 0);

  return Number.isFinite(convertido)
    ? convertido
    : 0;
}

function moeda(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dataHora(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(data);
}

function classeStatus(status: string): string {
  switch (status) {
    case "pago":
    case "enviado":
    case "concluido":
      return "velon-status-badge velon-status-success";

    case "em_separacao":
    case "separado":
    case "aguardando_pagamento":
      return "velon-status-badge velon-status-warning";

    case "cancelado":
      return "velon-status-badge velon-status-danger";

    default:
      return "velon-status-badge";
  }
}

export default async function DashboardPage() {
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
        WHERE status = 'ativo'
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
        WHERE status IN ('em_separacao', 'separado')
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

  const pedidosRecentes =
    await prisma.$queryRaw<PedidoRecente[]>`
      SELECT
        p.id,
        p.numero,
        c.responsavel AS cliente,
        p.valor_total::text,
        p.status,
        p.criado_em
      FROM comercial.pedidos AS p
      LEFT JOIN crm.clientes AS c
        ON c.id = p.cliente_id
      ORDER BY p.criado_em DESC
      LIMIT 5
    `;

  let whatsapp = {
    online: false,
    conectado: false,
    estado: "offline",
    nomePerfil: null as string | null,
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
      online: true,
      conectado:
        instancia?.connectionStatus === "open",
      estado:
        instancia?.connectionStatus ?? "not_found",
      nomePerfil:
        instancia?.profileName ?? null,
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

  const indicadores = [
    {
      titulo: "Clientes ativos",
      valor: resumo.clientes_ativos.toString(),
      variacao:
        resumo.clientes_hoje > 0
          ? `+${resumo.clientes_hoje} hoje`
          : `${resumo.clientes_total} cadastrados`,
      icone: "◎",
    },
    {
      titulo: "Conversas IA",
      valor: resumo.conversas_hoje.toString(),
      variacao:
        `${resumo.conversas_em_atendimento} em atendimento`,
      icone: "◉",
    },
    {
      titulo: "Orçamentos hoje",
      valor: resumo.orcamentos_hoje.toString(),
      variacao:
        moeda(numero(resumo.valor_orcamentos_hoje)),
      icone: "▤",
    },
    {
      titulo: "Faturamento hoje",
      valor: moeda(numero(resumo.faturamento_hoje)),
      variacao:
        `${resumo.pagamentos_pagos_hoje} pagamentos`,
      icone: "◈",
    },
  ];

  const modulos = [
    {
      nome: "Evolution API",
      status: whatsapp.online ? "Online" : "Offline",
      classe: whatsapp.online ? "online" : "offline",
    },
    {
      nome: "WhatsApp",
      status: whatsapp.conectado
        ? "Conectado"
        : whatsapp.estado,
      classe: whatsapp.conectado ? "online" : "offline",
    },
    {
      nome: "Consultor IA",
      status: "Operacional",
      classe: "online",
    },
    {
      nome: "PostgreSQL",
      status: "Saudável",
      classe: "online",
    },
    {
      nome: "Redis",
      status: "Saudável",
      classe: "online",
    },
    {
      nome: "n8n",
      status: "Disponível",
      classe: "online",
    },
  ];

  return (
    <main className="velon-dashboard-page">
      <section className="velon-dashboard-hero">
        <div>
          <p className="velon-eyebrow">
            Visão geral da operação
          </p>

          <h1>Dashboard Executivo</h1>

          <p>
            Dados reais de vendas, atendimento,
            pagamentos, estoque e WhatsApp.
          </p>
        </div>

        <div className="velon-dashboard-hero-actions">
          <Link
            href="/admin/whatsapp"
            className="velon-button velon-button-secondary"
          >
            Gerenciar WhatsApp
          </Link>

          <Link
            href="/orcamentos"
            className="velon-button velon-button-primary"
          >
            Ver orçamentos
          </Link>
        </div>
      </section>

      <section className="velon-kpi-grid">
        {indicadores.map((indicador) => (
          <article
            key={indicador.titulo}
            className="velon-kpi-card"
          >
            <div className="velon-kpi-card-top">
              <span>{indicador.titulo}</span>

              <div className="velon-kpi-icon">
                {indicador.icone}
              </div>
            </div>

            <strong>{indicador.valor}</strong>

            <small>{indicador.variacao}</small>
          </article>
        ))}
      </section>

      <section className="velon-dashboard-grid">
        <article className="velon-panel velon-panel-large">
          <div className="velon-panel-heading">
            <div>
              <p className="velon-eyebrow">
                Pedidos recentes
              </p>

              <h2>Últimos pedidos</h2>
            </div>

            <Link
              href="/pedidos"
              className="velon-panel-link"
            >
              Ver todos
            </Link>
          </div>

          <div className="velon-dashboard-table-wrapper">
            <table className="velon-dashboard-table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Data</th>
                  <th>Status</th>
                  <th className="velon-table-value">
                    Valor
                  </th>
                </tr>
              </thead>

              <tbody>
                {pedidosRecentes.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      Nenhum pedido cadastrado.
                    </td>
                  </tr>
                ) : (
                  pedidosRecentes.map((pedido) => (
                    <tr key={pedido.id.toString()}>
                      <td>
                        <strong>
                          {pedido.numero ??
                            `PED-${pedido.id}`}
                        </strong>
                      </td>

                      <td>
                        {pedido.cliente ??
                          "Cliente não vinculado"}
                      </td>

                      <td>
                        {dataHora(pedido.criado_em)}
                      </td>

                      <td>
                        <span
                          className={classeStatus(
                            pedido.status,
                          )}
                        >
                          {pedido.status}
                        </span>
                      </td>

                      <td className="velon-table-value">
                        {moeda(
                          numero(pedido.valor_total),
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="velon-panel">
          <div className="velon-panel-heading">
            <div>
              <p className="velon-eyebrow">
                Infraestrutura
              </p>

              <h2>Status dos módulos</h2>
            </div>
          </div>

          <div className="velon-module-list">
            {modulos.map((modulo) => (
              <div
                key={modulo.nome}
                className="velon-module-row"
              >
                <span
                  className={`velon-module-dot ${modulo.classe}`}
                />

                <strong>{modulo.nome}</strong>

                <small>{modulo.status}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="velon-panel">
          <div className="velon-panel-heading">
            <div>
              <p className="velon-eyebrow">
                WhatsApp
              </p>

              <h2>Operação de atendimento</h2>
            </div>
          </div>

          <div className="velon-mini-metrics">
            <div>
              <span>Estado da conexão</span>
              <strong>{whatsapp.estado}</strong>
            </div>

            <div>
              <span>Perfil</span>
              <strong>
                {whatsapp.nomePerfil ?? "Não identificado"}
              </strong>
            </div>

            <div>
              <span>Conversas</span>
              <strong>{whatsapp.conversas}</strong>
            </div>

            <div>
              <span>Contatos</span>
              <strong>{whatsapp.contatos}</strong>
            </div>

            <div>
              <span>Mensagens</span>
              <strong>{whatsapp.mensagens}</strong>
            </div>
          </div>
        </article>

        <article className="velon-panel">
          <div className="velon-panel-heading">
            <div>
              <p className="velon-eyebrow">
                Indicadores comerciais
              </p>

              <h2>Resumo geral</h2>
            </div>
          </div>

          <div className="velon-mini-metrics">
            <div>
              <span>Total de orçamentos</span>
              <strong>
                {resumo.orcamentos_total}
              </strong>
            </div>

            <div>
              <span>Total de pedidos</span>
              <strong>{resumo.pedidos_total}</strong>
            </div>

            <div>
              <span>Pedidos enviados</span>
              <strong>{resumo.pedidos_enviados}</strong>
            </div>

            <div>
              <span>Pagamentos pendentes</span>
              <strong>
                {resumo.pagamentos_pendentes}
              </strong>
            </div>

            <div>
              <span>Faturamento total</span>
              <strong>
                {moeda(
                  numero(resumo.faturamento_total),
                )}
              </strong>
            </div>
          </div>
        </article>

        <article className="velon-panel">
          <div className="velon-panel-heading">
            <div>
              <p className="velon-eyebrow">
                Estoque
              </p>

              <h2>Disponibilidade</h2>
            </div>
          </div>

          <div className="velon-mini-metrics">
            <div>
              <span>Produtos cadastrados</span>
              <strong>{resumo.produtos_total}</strong>
            </div>

            <div>
              <span>Produtos ativos</span>
              <strong>{resumo.produtos_ativos}</strong>
            </div>

            <div>
              <span>Unidades em estoque</span>
              <strong>
                {numero(
                  resumo.estoque_total,
                ).toLocaleString("pt-BR")}
              </strong>
            </div>

            <div>
              <span>Estoque baixo</span>
              <strong>
                {resumo.produtos_estoque_baixo}
              </strong>
            </div>
          </div>
        </article>
      </section>

      <GraficosExecutivos />
    </main>
  );
}
