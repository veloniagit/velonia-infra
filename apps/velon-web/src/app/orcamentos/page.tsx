import Link from "next/link";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type OrcamentoBanco = {
  id: bigint;
  numero: string | null;
  titulo: string | null;
  descricao: string | null;
  valor_total: string;
  desconto: string;
  validade: Date | null;
  status: string;
  criado_em: Date;
  quantidade_itens: bigint;
};

function formatarMoeda(valor: string): string {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(data: Date | null): string {
  if (!data) {
    return "Não definida";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
  }).format(data);
}

function classeStatus(status: string): string {
  switch (status.toLowerCase()) {
    case "aprovada":
    case "aprovado":
      return "status-badge status-approved";

    case "enviada":
    case "enviado":
      return "status-badge status-sent";

    case "recusada":
    case "recusado":
      return "status-badge status-rejected";

    default:
      return "status-badge status-draft";
  }
}

export default async function OrcamentosPage() {
  const prisma = getPrisma();

  const orcamentos = await prisma.$queryRaw<OrcamentoBanco[]>`
    SELECT
      p.id,
      p.numero,
      p.titulo,
      p.descricao,
      p.valor_total::text,
      p.desconto::text,
      p.validade,
      p.status,
      p.criado_em,
      COUNT(pi.id) AS quantidade_itens
    FROM comercial.propostas AS p
    LEFT JOIN comercial.proposta_itens AS pi
      ON pi.proposta_id = p.id
    GROUP BY p.id
    ORDER BY p.criado_em DESC, p.id DESC
    LIMIT 100
  `;

  const totalEmOrcamentos = orcamentos.reduce(
    (acumulado, item) => acumulado + Number(item.valor_total),
    0,
  );

  const rascunhos = orcamentos.filter(
    (item) => item.status === "rascunho",
  ).length;

  return (
    <main className="module-page">
      <header className="module-header">
        <div>
          <p className="eyebrow">VelON AutoParts AI</p>
          <h1>Orçamentos</h1>
          <p className="module-subtitle">
            Propostas comerciais criadas pelos vendedores e pelo agente de IA.
          </p>
        </div>

        <div className="module-actions">
          <Link href="/" className="secondary-button link-button">
            Voltar ao Dashboard
          </Link>

          <button type="button" className="primary-button">
            + Novo orçamento
          </button>
        </div>
      </header>

      <section className="module-metrics">
        <article className="metric-card">
          <p>Total de orçamentos</p>
          <strong>{orcamentos.length}</strong>
          <span>Registros cadastrados</span>
        </article>

        <article className="metric-card">
          <p>Valor em propostas</p>
          <strong>{formatarMoeda(String(totalEmOrcamentos))}</strong>
          <span>Volume comercial total</span>
        </article>

        <article className="metric-card">
          <p>Rascunhos</p>
          <strong>{rascunhos}</strong>
          <span>Aguardando envio</span>
        </article>

        <article className="metric-card">
          <p>Itens orçados</p>
          <strong>
            {orcamentos.reduce(
              (total, item) => total + Number(item.quantidade_itens),
              0,
            )}
          </strong>
          <span>Produtos adicionados</span>
        </article>
      </section>

      <section className="panel module-panel">
        <div className="panel-heading">
          <div>
            <h2>Lista de orçamentos</h2>
            <p>Acompanhe propostas, valores, validade e situação comercial.</p>
          </div>

          <div className="table-search">
            <input
              type="search"
              placeholder="Pesquisar orçamento..."
              aria-label="Pesquisar orçamento"
            />
          </div>
        </div>

        {orcamentos.length === 0 ? (
          <div className="empty-state">
            <h3>Nenhum orçamento cadastrado</h3>
            <p>Crie o primeiro orçamento comercial do VelON AutoParts AI.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Título</th>
                  <th>Itens</th>
                  <th>Validade</th>
                  <th>Status</th>
                  <th className="table-value">Valor</th>
                  <th>Ação</th>
                </tr>
              </thead>

              <tbody>
                {orcamentos.map((orcamento) => (
                  <tr key={orcamento.id.toString()}>
                    <td className="table-code">
                      {orcamento.numero ?? `#${orcamento.id}`}
                    </td>

                    <td>
                      <strong>{orcamento.titulo ?? "Sem título"}</strong>
                      <small>
                        {orcamento.descricao ?? "Sem descrição"}
                      </small>
                    </td>

                    <td>{Number(orcamento.quantidade_itens)}</td>

                    <td>{formatarData(orcamento.validade)}</td>

                    <td>
                      <span className={classeStatus(orcamento.status)}>
                        {orcamento.status}
                      </span>
                    </td>

                    <td className="table-value">
                      {formatarMoeda(orcamento.valor_total)}
                    </td>

                    <td>
                      <Link
                        href={`/orcamentos/${orcamento.id.toString()}`}
                        className="table-link"
                      >
                        Ver detalhes
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
