"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

type NivelAlerta = "critico" | "aviso";

type Alerta = {
  id: string;
  tipo: string;
  nivel: NivelAlerta;
  titulo: string;
  descricao: string;
  referencia: string;
  href: string;
};

type RespostaAlertas = {
  status: string;
  atualizadoEm: string;
  resumo: {
    total: number;
    criticos: number;
    avisos: number;
    estoqueBaixo: number;
    pagamentosPendentes: number;
    pedidosOperacionais: number;
    conversasParadas: number;
    falhasIntegracao: number;
  };
  whatsapp: {
    conectado: boolean;
    estado: string;
  };
  alertas: Alerta[];
  mensagem?: string;
};

function formatarHorario(dataIso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(dataIso));
}

function iconeAlerta(tipo: string): string {
  switch (tipo) {
    case "estoque_baixo":
      return "▦";

    case "pagamento_pendente":
      return "◈";

    case "pedido_operacional":
      return "▣";

    case "conversa_parada":
      return "◉";

    case "whatsapp_offline":
      return "◌";

    case "erro_integracao":
      return "!";

    default:
      return "!";
  }
}

export default function AlertasExecutivos() {
  const [dados, setDados] =
    useState<RespostaAlertas | null>(null);

  const [carregando, setCarregando] =
    useState(true);

  const [erro, setErro] =
    useState<string | null>(null);

  const carregarAlertas = useCallback(async () => {
    try {
      const resposta = await fetch(
        "/api/dashboard/alertas",
        {
          cache: "no-store",
        },
      );

      const resultado =
        (await resposta.json()) as RespostaAlertas;

      if (!resposta.ok) {
        throw new Error(
          resultado.mensagem ??
            "Não foi possível carregar os alertas.",
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
    carregarAlertas();

    const intervalo = window.setInterval(
      carregarAlertas,
      30000,
    );

    return () =>
      window.clearInterval(intervalo);
  }, [carregarAlertas]);

  if (carregando) {
    return (
      <section className="velon-alerts-section">
        <article className="velon-panel">
          <p>Carregando alertas operacionais...</p>
        </article>
      </section>
    );
  }

  if (erro || !dados) {
    return (
      <section className="velon-alerts-section">
        <article className="velon-panel">
          <div className="velon-panel-heading">
            <div>
              <p className="velon-eyebrow">
                Monitoramento
              </p>

              <h2>Alertas indisponíveis</h2>
            </div>
          </div>

          <p>{erro}</p>

          <button
            type="button"
            className="velon-button velon-button-primary"
            onClick={carregarAlertas}
          >
            Tentar novamente
          </button>
        </article>
      </section>
    );
  }

  return (
    <section className="velon-alerts-section">
      <article className="velon-panel velon-panel-large">
        <div className="velon-panel-heading">
          <div>
            <p className="velon-eyebrow">
              Monitoramento inteligente
            </p>

            <h2>Central de alertas</h2>

            <p className="velon-alerts-subtitle">
              Pendências operacionais que precisam de
              atenção.
            </p>
          </div>

          <div className="velon-alerts-heading-actions">
            <div className="velon-alert-counter">
              <span>{dados.resumo.total}</span>
              alertas
            </div>

            <button
              type="button"
              className="velon-alert-refresh"
              onClick={carregarAlertas}
            >
              Atualizar
            </button>
          </div>
        </div>

        <div className="velon-alert-summary-grid">
          <div className="velon-alert-summary-card critical">
            <span>Críticos</span>
            <strong>{dados.resumo.criticos}</strong>
          </div>

          <div className="velon-alert-summary-card warning">
            <span>Avisos</span>
            <strong>{dados.resumo.avisos}</strong>
          </div>

          <div className="velon-alert-summary-card">
            <span>Estoque baixo</span>
            <strong>
              {dados.resumo.estoqueBaixo}
            </strong>
          </div>

          <div className="velon-alert-summary-card">
            <span>Pagamentos</span>
            <strong>
              {dados.resumo.pagamentosPendentes}
            </strong>
          </div>

          <div className="velon-alert-summary-card">
            <span>Pedidos</span>
            <strong>
              {dados.resumo.pedidosOperacionais}
            </strong>
          </div>

          <div className="velon-alert-summary-card">
            <span>Conversas paradas</span>
            <strong>
              {dados.resumo.conversasParadas}
            </strong>
          </div>
        </div>

        {dados.alertas.length === 0 ? (
          <div className="velon-alerts-empty">
            <div>✓</div>

            <strong>Operação sem pendências</strong>

            <p>
              Nenhum alerta crítico ou operacional foi
              identificado.
            </p>
          </div>
        ) : (
          <div className="velon-alerts-list">
            {dados.alertas.map((alerta) => (
              <Link
                key={alerta.id}
                href={alerta.href}
                className={`velon-executive-alert ${alerta.nivel}`}
              >
                <div className="velon-executive-alert-icon">
                  {iconeAlerta(alerta.tipo)}
                </div>

                <div className="velon-executive-alert-content">
                  <div>
                    <strong>{alerta.titulo}</strong>

                    <span
                      className={`velon-alert-level ${alerta.nivel}`}
                    >
                      {alerta.nivel === "critico"
                        ? "Crítico"
                        : "Atenção"}
                    </span>
                  </div>

                  <p>{alerta.descricao}</p>

                  <small>
                    Referência: {alerta.referencia}
                  </small>
                </div>

                <span className="velon-alert-arrow">
                  →
                </span>
              </Link>
            ))}
          </div>
        )}

        <footer className="velon-alerts-footer">
          <div>
            <span
              className={
                dados.whatsapp.conectado
                  ? "velon-alert-status-dot online"
                  : "velon-alert-status-dot offline"
              }
            />

            WhatsApp: {dados.whatsapp.estado}
          </div>

          <span>
            Atualizado às{" "}
            {formatarHorario(dados.atualizadoEm)}
          </span>
        </footer>
      </article>
    </section>
  );
}
