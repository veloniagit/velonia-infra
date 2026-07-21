import { getPrisma } from "@/lib/prisma";
const menuItems = [
  "Dashboard",
  "Leads",
  "Empresas",
  "Contatos",
  "Oportunidades",
  "Pipeline",
  "Atividades",
  "Agenda",
  "Clientes",
  "Propostas",
  "Financeiro",
  "Inteligência Artificial",
  "Configurações",
];

const indicators = [
  {
    label: "Clientes ativos",
    value: "5",
    detail: "Contratos ativos",
  },
  {
    label: "MRR atual",
    value: "R$ 6.391",
    detail: "Receita mensal recorrente",
  },
  {
    label: "Pipeline total",
    value: "R$ 226 mil",
    detail: "Negociações em andamento",
  },
  {
    label: "Oportunidades",
    value: "14",
    detail: "Oportunidades abertas",
  },
];

const opportunities = [
  {
    company: "Mega Distribuidora",
    stage: "Negociação",
    seller: "Vendedor 2",
    value: "R$ 35.000",
  },
  {
    company: "Premium Parts",
    stage: "Diagnóstico",
    seller: "Vendedor 2",
    value: "R$ 26.000",
  },
  {
    company: "Oficina Premium",
    stage: "Proposta",
    seller: "Vendedor 3",
    value: "R$ 25.000",
  },
  {
    company: "Distribuidora Sul",
    stage: "Qualificação",
    seller: "Vendedor 1",
    value: "R$ 22.000",
  },
];

export const dynamic = "force-dynamic";

export default async function Home() {
  const prisma = getPrisma();

  const resultado = await prisma.$queryRaw<
    Array<{
      clientes_ativos: bigint;
      mrr_atual: string;
      pipeline_total: string;
      oportunidades_abertas: bigint;
    }>
  >`
    SELECT
      (
        SELECT COUNT(*)
        FROM crm.clientes
        WHERE status = 'ativo'
      ) AS clientes_ativos,

      (
        SELECT COALESCE(SUM(mensalidade), 0)::text
        FROM crm.clientes
        WHERE status = 'ativo'
      ) AS mrr_atual,

      (
        SELECT COALESCE(SUM(valor), 0)::text
        FROM comercial.oportunidades
        WHERE status = 'aberta'
      ) AS pipeline_total,

      (
        SELECT COUNT(*)
        FROM comercial.oportunidades
        WHERE status = 'aberta'
      ) AS oportunidades_abertas
  `;

  const resumo = resultado[0];

  const indicadoresReais = [
    {
      label: "Clientes ativos",
      value: String(Number(resumo?.clientes_ativos ?? 0)),
      detail: "Contratos ativos",
    },
    {
      label: "MRR atual",
      value: Number(resumo?.mrr_atual ?? 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
      detail: "Receita mensal recorrente",
    },
    {
      label: "Pipeline total",
      value: Number(resumo?.pipeline_total ?? 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
      detail: "Negociações em andamento",
    },
    {
      label: "Oportunidades",
      value: String(Number(resumo?.oportunidades_abertas ?? 0)),
      detail: "Oportunidades abertas",
    },
  ];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-title">
            VelON <span>OS</span>
          </div>
          <p>Sistema Operacional Empresarial</p>
        </div>

        <nav className="navigation">
          {menuItems.map((item, index) => (
            <button
              type="button"
              key={item}
              className={index === 0 ? "nav-item active" : "nav-item"}
            >
              <span className="nav-icon">{index + 1}</span>
              <span>{item}</span>
            </button>
          ))}
        </nav>

        <div className="profile-card">
          <div className="profile-avatar">VG</div>
          <div>
            <strong>Administrador</strong>
            <span>VelON IA</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">VelON Command Center</p>
            <h1>Visão geral</h1>
          </div>

          <div className="topbar-actions">
            <button type="button" className="secondary-button">
              Notificações
            </button>
            <button type="button" className="primary-button">
              + Novo lead
            </button>
          </div>
        </header>

        <div className="content-wrapper">
          <section>
            <div className="section-heading">
              <div>
                <h2>Indicadores principais</h2>
                <p>Resumo executivo da operação comercial</p>
              </div>
              <span>Atualização em tempo real</span>
            </div>

            <div className="metrics-grid">
              {indicadoresReais.map((indicator) => (
                <article className="metric-card" key={indicator.label}>
                  <p>{indicator.label}</p>
                  <strong>{indicator.value}</strong>
                  <span>{indicator.detail}</span>
                </article>
              ))}
            </div>
          </section>

          <section className="dashboard-grid">
            <article className="panel opportunities-panel">
              <div className="panel-heading">
                <div>
                  <h2>Oportunidades em destaque</h2>
                  <p>Negociações com maior valor</p>
                </div>
                <button type="button">Ver pipeline</button>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Empresa</th>
                      <th>Etapa</th>
                      <th>Vendedor</th>
                      <th>Valor</th>
                    </tr>
                  </thead>

                  <tbody>
                    {opportunities.map((opportunity) => (
                      <tr key={opportunity.company}>
                        <td>{opportunity.company}</td>
                        <td>
                          <span className="stage-badge">
                            {opportunity.stage}
                          </span>
                        </td>
                        <td>{opportunity.seller}</td>
                        <td>{opportunity.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="panel goal-panel">
              <h2>Meta comercial</h2>
              <p>Resultado acumulado da equipe</p>

              <div className="goal-value">
                <div>
                  <strong>R$ 18 mil</strong>
                  <span>de R$ 113 mil em metas</span>
                </div>
                <b>15,9%</b>
              </div>

              <div className="progress-track">
                <div className="progress-value" />
              </div>

              <div className="goal-details">
                <div>
                  <span>Leads cadastrados</span>
                  <strong>20</strong>
                </div>

                <div>
                  <span>Leads qualificados</span>
                  <strong>7</strong>
                </div>

                <div>
                  <span>Conversão atual</span>
                  <strong>6,67%</strong>
                </div>
              </div>
            </article>
          </section>

          <section className="hero-panel">
            <p>VelON IA</p>
            <h2>Mais velocidade. Mais inteligência. Mais resultado.</h2>
            <span>
              Estrutura inicial do VelON OS pronta para receber os módulos de
              CRM, automação, financeiro e inteligência artificial.
            </span>
          </section>
        </div>
      </main>
    </div>
  );
}
