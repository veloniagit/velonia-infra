import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type OrcamentoBanco = {
  id: bigint;
  numero: string | null;
  titulo: string | null;
  descricao: string | null;
  desconto: string;
  valor_total: string;
  validade: Date | null;
  status: string;
  criado_em: Date;
};

type ItemBanco = {
  id: bigint;
  produto_id: bigint | null;
  codigo_produto: string | null;
  descricao: string;
  quantidade: string;
  valor_unitario: string;
  desconto: string;
  valor_total: string;
  observacoes: string | null;
  estoque_atual: string | null;
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatarMoeda(valor: number | string): string {
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
    case "aprovado":
    case "aprovada":
      return "status-badge status-approved";

    case "enviado":
    case "enviada":
      return "status-badge status-sent";

    case "recusado":
    case "recusada":
    case "cancelado":
      return "status-badge status-rejected";

    default:
      return "status-badge status-draft";
  }
}

export default async function OrcamentoDetalhesPage({
  params,
}: PageProps) {
  const { id } = await params;

  if (!/^\d+$/.test(id)) {
    notFound();
  }

  const prisma = getPrisma();
  const orcamentoId = BigInt(id);

  const orcamentos = await prisma.$queryRaw<OrcamentoBanco[]>`
    SELECT
      id,
      numero,
      titulo,
      descricao,
      desconto::text,
      valor_total::text,
      validade,
      status,
      criado_em
    FROM comercial.propostas
    WHERE id = ${orcamentoId}
    LIMIT 1
  `;

  const orcamento = orcamentos[0];

  if (!orcamento) {
    notFound();
  }

  const itens = await prisma.$queryRaw<ItemBanco[]>`
    SELECT
      pi.id,
      pi.produto_id,
      pi.codigo_produto,
      pi.descricao,
      pi.quantidade::text,
      pi.valor_unitario::text,
      pi.desconto::text,
      pi.valor_total::text,
      pi.observacoes,
      p.estoque::text AS estoque_atual
    FROM comercial.proposta_itens AS pi
    LEFT JOIN catalogo.produtos AS p
      ON p.id = pi.produto_id
    WHERE pi.proposta_id = ${orcamentoId}
    ORDER BY pi.id
  `;

  const subtotal = itens.reduce(
    (total, item) => total + Number(item.valor_total),
    0,
  );

  return (
    <main className="module-page">
      <header className="module-header">
        <div>
          <p className="eyebrow">VelON AutoParts AI</p>

          <div className="detail-title-line">
            <h1>{orcamento.numero ?? `Orçamento #${orcamento.id}`}</h1>

            <span className={classeStatus(orcamento.status)}>
              {orcamento.status}
            </span>
          </div>

          <p className="module-subtitle">
            {orcamento.titulo ?? "Orçamento comercial"}
          </p>
        </div>

        <div className="module-actions">
          <Link
            href="/orcamentos"
            className="secondary-button link-button"
          >
            Voltar aos orçamentos
          </Link>

          <button type="button" className="secondary-button">
            Gerar PDF
          </button>

          <button type="button" className="primary-button">
            Aprovar orçamento
          </button>
        </div>
      </header>

      <section className="detail-grid">
        <article className="panel detail-main-panel">
          <div className="panel-heading">
            <div>
              <h2>Itens do orçamento</h2>
              <p>Produtos, quantidades e valores da proposta comercial.</p>
            </div>

            <span className="detail-count">
              {itens.length} {itens.length === 1 ? "item" : "itens"}
            </span>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Produto</th>
                  <th>Quantidade</th>
                  <th>Estoque</th>
                  <th className="table-value">Unitário</th>
                  <th className="table-value">Desconto</th>
                  <th className="table-value">Total</th>
                </tr>
              </thead>

              <tbody>
                {itens.map((item) => (
                  <tr key={item.id.toString()}>
                    <td className="table-code">
                      {item.codigo_produto ?? "Sem código"}
                    </td>

                    <td>
                      <strong>{item.descricao}</strong>

                      {item.observacoes && (
                        <small>{item.observacoes}</small>
                      )}
                    </td>

                    <td>
                      {Number(item.quantidade).toLocaleString("pt-BR")}
                    </td>

                    <td>
                      {item.estoque_atual === null
                        ? "—"
                        : Number(item.estoque_atual).toLocaleString("pt-BR")}
                    </td>

                    <td className="table-value">
                      {formatarMoeda(item.valor_unitario)}
                    </td>

                    <td className="table-value">
                      {formatarMoeda(item.desconto)}
                    </td>

                    <td className="table-value">
                      {formatarMoeda(item.valor_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <aside className="panel detail-summary">
          <div>
            <p className="eyebrow">Resumo financeiro</p>
            <h2>Total do orçamento</h2>
          </div>

          <div className="summary-row">
            <span>Subtotal dos itens</span>
            <strong>{formatarMoeda(subtotal)}</strong>
          </div>

          <div className="summary-row">
            <span>Desconto geral</span>
            <strong>- {formatarMoeda(orcamento.desconto)}</strong>
          </div>

          <div className="summary-total">
            <span>Total</span>
            <strong>{formatarMoeda(orcamento.valor_total)}</strong>
          </div>

          <div className="summary-info">
            <div>
              <span>Validade</span>
              <strong>{formatarData(orcamento.validade)}</strong>
            </div>

            <div>
              <span>Criado em</span>
              <strong>{formatarData(orcamento.criado_em)}</strong>
            </div>
          </div>

          {orcamento.descricao && (
            <div className="summary-description">
              <span>Observações</span>
              <p>{orcamento.descricao}</p>
            </div>
          )}

          <div className="summary-actions">
            <button type="button" className="primary-button">
              Enviar pelo WhatsApp
            </button>

            <button type="button" className="secondary-button">
              Editar orçamento
            </button>
          </div>
        </aside>
      </section>
    </main>
  );
}
