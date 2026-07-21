"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type ItemSerie = {
  data: string;
  rotulo: string;
  orcamentos: number;
  pedidos: number;
  pagamentos: number;
  faturamento: number;
};

type DadosGraficos = {
  status: string;
  atualizadoEm: string;
  serie: ItemSerie[];
  funil: {
    conversas: number;
    orcamentos: number;
    pedidos: number;
    pagamentos: number;
    conversaoConversaOrcamento: number;
    conversaoOrcamentoPedido: number;
    conversaoPedidoPagamento: number;
    conversaoGeral: number;
  };
  financeiro: {
    faturamentoTotal: number;
    ticketMedio: number;
  };
};

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function limitarPercentual(valor: number): number {
  return Math.max(0, Math.min(100, valor));
}

export default function GraficosExecutivos() {
  const [dados, setDados] =
    useState<DadosGraficos | null>(null);

  const [carregando, setCarregando] =
    useState(true);

  const [erro, setErro] =
    useState<string | null>(null);

  const carregarDados = useCallback(async () => {
    try {
      const resposta = await fetch(
        "/api/dashboard/graficos",
        {
          cache: "no-store",
        },
      );

      const resultado =
        (await resposta.json()) as DadosGraficos & {
          mensagem?: string;
        };

      if (!resposta.ok) {
        throw new Error(
          resultado.mensagem ||
            "Não foi possível carregar os gráficos.",
        );
      }

      setDados(resultado);
      setErro(null);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro desconhecido.",
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();

    const intervalo = window.setInterval(
      carregarDados,
      30000,
    );

    return () =>
      window.clearInterval(intervalo);
  }, [carregarDados]);

  const maiorFaturamento = useMemo(() => {
    if (!dados?.serie.length) {
      return 1;
    }

    return Math.max(
      ...dados.serie.map(
        (item) => item.faturamento,
      ),
      1,
    );
  }, [dados]);

  const maiorOperacao = useMemo(() => {
    if (!dados?.serie.length) {
      return 1;
    }

    return Math.max(
      ...dados.serie.flatMap((item) => [
        item.orcamentos,
        item.pedidos,
        item.pagamentos,
      ]),
      1,
    );
  }, [dados]);

  if (carregando) {
    return (
      <section className="velon-dashboard-charts-grid">
        <article className="velon-panel velon-panel-large">
          <p>Carregando indicadores executivos...</p>
        </article>
      </section>
    );
  }

  if (erro || !dados) {
    return (
      <section className="velon-dashboard-charts-grid">
        <article className="velon-panel velon-panel-large">
          <h2>Gráficos indisponíveis</h2>
          <p>{erro}</p>

          <button
            type="button"
            className="velon-button velon-button-primary"
            onClick={carregarDados}
          >
            Tentar novamente
          </button>
        </article>
      </section>
    );
  }

  const etapasFunil = [
    {
      nome: "Conversas",
      valor: dados.funil.conversas,
      percentual: 100,
    },
    {
      nome: "Orçamentos",
      valor: dados.funil.orcamentos,
      percentual:
        dados.funil.conversaoConversaOrcamento,
    },
    {
      nome: "Pedidos",
      valor: dados.funil.pedidos,
      percentual:
        dados.funil.conversaoOrcamentoPedido,
    },
    {
      nome: "Pagamentos",
      valor: dados.funil.pagamentos,
      percentual:
        dados.funil.conversaoPedidoPagamento,
    },
  ];

  return (
    <section className="velon-dashboard-charts-grid">
      <article className="velon-panel velon-panel-large">
        <div className="velon-panel-heading">
          <div>
            <p className="velon-eyebrow">
              Desempenho financeiro
            </p>

            <h2>Faturamento dos últimos 7 dias</h2>
          </div>

          <div className="velon-chart-summary">
            <span>Total recebido</span>
            <strong>
              {formatarMoeda(
                dados.financeiro.faturamentoTotal,
              )}
            </strong>
          </div>
        </div>

        <div className="velon-revenue-chart">
          {dados.serie.map((item) => {
            const altura =
              item.faturamento > 0
                ? Math.max(
                    8,
                    (item.faturamento /
                      maiorFaturamento) *
                      100,
                  )
                : 2;

            return (
              <div
                key={item.data}
                className="velon-chart-column"
              >
                <div className="velon-chart-value">
                  {item.faturamento > 0
                    ? formatarMoeda(
                        item.faturamento,
                      )
                    : "R$ 0"}
                </div>

                <div className="velon-chart-track">
                  <div
                    className="velon-chart-bar velon-chart-bar-revenue"
                    style={{
                      height: `${altura}%`,
                    }}
                    title={`${item.rotulo}: ${formatarMoeda(
                      item.faturamento,
                    )}`}
                  />
                </div>

                <span>{item.rotulo}</span>
              </div>
            );
          })}
        </div>
      </article>

      <article className="velon-panel velon-panel-large">
        <div className="velon-panel-heading">
          <div>
            <p className="velon-eyebrow">
              Volume comercial
            </p>

            <h2>
              Orçamentos, pedidos e pagamentos
            </h2>
          </div>

          <div className="velon-chart-legend">
            <span>
              <i className="legend-budget" />
              Orçamentos
            </span>

            <span>
              <i className="legend-order" />
              Pedidos
            </span>

            <span>
              <i className="legend-payment" />
              Pagamentos
            </span>
          </div>
        </div>

        <div className="velon-operation-chart">
          {dados.serie.map((item) => (
            <div
              key={item.data}
              className="velon-operation-column"
            >
              <div className="velon-operation-bars">
                <div
                  className="velon-operation-bar operation-budget"
                  style={{
                    height: `${
                      item.orcamentos > 0
                        ? Math.max(
                            8,
                            (item.orcamentos /
                              maiorOperacao) *
                              100,
                          )
                        : 2
                    }%`,
                  }}
                  title={`${item.orcamentos} orçamentos`}
                />

                <div
                  className="velon-operation-bar operation-order"
                  style={{
                    height: `${
                      item.pedidos > 0
                        ? Math.max(
                            8,
                            (item.pedidos /
                              maiorOperacao) *
                              100,
                          )
                        : 2
                    }%`,
                  }}
                  title={`${item.pedidos} pedidos`}
                />

                <div
                  className="velon-operation-bar operation-payment"
                  style={{
                    height: `${
                      item.pagamentos > 0
                        ? Math.max(
                            8,
                            (item.pagamentos /
                              maiorOperacao) *
                              100,
                          )
                        : 2
                    }%`,
                  }}
                  title={`${item.pagamentos} pagamentos`}
                />
              </div>

              <span>{item.rotulo}</span>
            </div>
          ))}
        </div>
      </article>

      <article className="velon-panel">
        <div className="velon-panel-heading">
          <div>
            <p className="velon-eyebrow">
              Conversão
            </p>

            <h2>Funil comercial</h2>
          </div>
        </div>

        <div className="velon-funnel-list">
          {etapasFunil.map((etapa, indice) => (
            <div
              key={etapa.nome}
              className="velon-funnel-item"
            >
              <div className="velon-funnel-item-header">
                <span>{etapa.nome}</span>
                <strong>{etapa.valor}</strong>
              </div>

              <div className="velon-funnel-track">
                <div
                  className={`velon-funnel-progress funnel-step-${
                    indice + 1
                  }`}
                  style={{
                    width: `${limitarPercentual(
                      etapa.percentual,
                    )}%`,
                  }}
                />
              </div>

              {indice > 0 && (
                <small>
                  {etapa.percentual.toLocaleString(
                    "pt-BR",
                  )}
                  % da etapa anterior
                </small>
              )}
            </div>
          ))}
        </div>
      </article>

      <article className="velon-panel">
        <div className="velon-panel-heading">
          <div>
            <p className="velon-eyebrow">
              Indicadores de eficiência
            </p>

            <h2>Performance comercial</h2>
          </div>
        </div>

        <div className="velon-performance-grid">
          <div>
            <span>Ticket médio</span>
            <strong>
              {formatarMoeda(
                dados.financeiro.ticketMedio,
              )}
            </strong>
          </div>

          <div>
            <span>Conversão geral</span>
            <strong>
              {dados.funil.conversaoGeral.toLocaleString(
                "pt-BR",
              )}
              %
            </strong>
          </div>

          <div>
            <span>Orçamento → pedido</span>
            <strong>
              {dados.funil.conversaoOrcamentoPedido.toLocaleString(
                "pt-BR",
              )}
              %
            </strong>
          </div>

          <div>
            <span>Pedido → pagamento</span>
            <strong>
              {dados.funil.conversaoPedidoPagamento.toLocaleString(
                "pt-BR",
              )}
              %
            </strong>
          </div>
        </div>

        <p className="velon-chart-updated">
          Atualização automática a cada 30 segundos.
        </p>
      </article>
    </section>
  );
}
