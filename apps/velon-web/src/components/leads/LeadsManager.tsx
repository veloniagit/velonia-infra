"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type Lead = {
  id: string;
  empresa: string | null;
  responsavel: string | null;
  whatsapp: string | null;
  email: string | null;
  segmento: string | null;
  cidade: string | null;
  estado: string | null;
  origem: string | null;
  temperatura: string;
  status: string;
  vendedor_id: string | null;
  vendedor_nome: string | null;
  valor_estimado: number;
  ultimo_contato: string | null;
  proximo_contato: string | null;
  observacoes: string | null;
  criado_em: string;
  atualizado_em: string;
};

type Vendedor = {
  id: string;
  nome: string;
  email: string | null;
  whatsapp: string | null;
};

type FormularioLead = {
  empresa: string;
  responsavel: string;
  whatsapp: string;
  email: string;
  segmento: string;
  cidade: string;
  estado: string;
  origem: string;
  temperatura: string;
  status: string;
  vendedor_id: string;
  valor_estimado: string;
  ultimo_contato: string;
  proximo_contato: string;
  observacoes: string;
};

const formularioInicial: FormularioLead = {
  empresa: "",
  responsavel: "",
  whatsapp: "",
  email: "",
  segmento: "",
  cidade: "",
  estado: "",
  origem: "Prospecção ativa",
  temperatura: "frio",
  status: "novo",
  vendedor_id: "",
  valor_estimado: "",
  ultimo_contato: "",
  proximo_contato: "",
  observacoes: "",
};

const statusDisponiveis = [
  ["novo", "Novo"],
  ["contato_realizado", "Contato realizado"],
  ["qualificado", "Qualificado"],
  ["proposta", "Proposta"],
  ["negociacao", "Negociação"],
  ["fechado", "Fechado"],
  ["perdido", "Perdido"],
];

const temperaturas = [
  ["frio", "Frio"],
  ["morno", "Morno"],
  ["quente", "Quente"],
];

function moeda(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dataFormulario(valor: string | null): string {
  if (!valor) {
    return "";
  }

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "";
  }

  const deslocamento = data.getTimezoneOffset() * 60000;

  return new Date(data.getTime() - deslocamento)
    .toISOString()
    .slice(0, 16);
}

function dataExibicao(valor: string | null): string {
  if (!valor) {
    return "Não definido";
  }

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "Não definido";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

function apenasNumeros(valor: string): string {
  return valor.replace(/\D/g, "");
}

function classeTemperatura(temperatura: string): string {
  return `velon-lead-temperature velon-lead-temperature-${temperatura}`;
}

function classeStatus(status: string): string {
  return `velon-lead-status velon-lead-status-${status}`;
}

function rotuloStatus(status: string): string {
  return (
    statusDisponiveis.find(([valor]) => valor === status)?.[1] ??
    status
  );
}

function rotuloTemperatura(temperatura: string): string {
  return (
    temperaturas.find(([valor]) => valor === temperatura)?.[1] ??
    temperatura
  );
}

export default function LeadsManager() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [formulario, setFormulario] =
    useState<FormularioLead>(formularioInicial);

  const [leadEditando, setLeadEditando] =
    useState<string | null>(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroTemperatura, setFiltroTemperatura] =
    useState("");
  const [filtroVendedor, setFiltroVendedor] = useState("");

  const carregarLeads = useCallback(async () => {
    try {
      setCarregando(true);

      const resposta = await fetch("/api/leads", {
        cache: "no-store",
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          resultado.mensagem ||
            "Não foi possível carregar os Leads.",
        );
      }

      setLeads(resultado.leads ?? []);
      setVendedores(resultado.vendedores ?? []);
      setErro(null);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro desconhecido ao carregar Leads.",
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarLeads();
  }, [carregarLeads]);

  const leadsFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return leads.filter((lead) => {
      const correspondeBusca =
        !termo ||
        [
          lead.empresa,
          lead.responsavel,
          lead.whatsapp,
          lead.email,
          lead.segmento,
          lead.cidade,
        ].some((campo) =>
          campo?.toLowerCase().includes(termo),
        );

      const correspondeStatus =
        !filtroStatus || lead.status === filtroStatus;

      const correspondeTemperatura =
        !filtroTemperatura ||
        lead.temperatura === filtroTemperatura;

      const correspondeVendedor =
        !filtroVendedor ||
        lead.vendedor_id === filtroVendedor;

      return (
        correspondeBusca &&
        correspondeStatus &&
        correspondeTemperatura &&
        correspondeVendedor
      );
    });
  }, [
    leads,
    busca,
    filtroStatus,
    filtroTemperatura,
    filtroVendedor,
  ]);

  const indicadores = useMemo(() => {
    return {
      total: leads.length,
      novos: leads.filter((lead) => lead.status === "novo")
        .length,
      quentes: leads.filter(
        (lead) => lead.temperatura === "quente",
      ).length,
      valor: leads.reduce(
        (total, lead) => total + lead.valor_estimado,
        0,
      ),
    };
  }, [leads]);

  function abrirNovoLead() {
    setLeadEditando(null);
    setFormulario(formularioInicial);
    setMensagem(null);
    setErro(null);
    setModalAberto(true);
  }

  function abrirEdicao(lead: Lead) {
    setLeadEditando(lead.id);

    setFormulario({
      empresa: lead.empresa ?? "",
      responsavel: lead.responsavel ?? "",
      whatsapp: lead.whatsapp ?? "",
      email: lead.email ?? "",
      segmento: lead.segmento ?? "",
      cidade: lead.cidade ?? "",
      estado: lead.estado ?? "",
      origem: lead.origem ?? "",
      temperatura: lead.temperatura,
      status: lead.status,
      vendedor_id: lead.vendedor_id ?? "",
      valor_estimado: String(lead.valor_estimado ?? 0),
      ultimo_contato: dataFormulario(lead.ultimo_contato),
      proximo_contato: dataFormulario(lead.proximo_contato),
      observacoes: lead.observacoes ?? "",
    });

    setMensagem(null);
    setErro(null);
    setModalAberto(true);
  }

  function fecharModal() {
    if (salvando) {
      return;
    }

    setModalAberto(false);
    setLeadEditando(null);
    setFormulario(formularioInicial);
  }

  function atualizarCampo(
    campo: keyof FormularioLead,
    valor: string,
  ) {
    setFormulario((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  async function salvarLead(event: FormEvent) {
    event.preventDefault();

    try {
      setSalvando(true);
      setErro(null);
      setMensagem(null);

      const url = leadEditando
        ? `/api/leads/${leadEditando}`
        : "/api/leads";

      const resposta = await fetch(url, {
        method: leadEditando ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formulario,
          whatsapp: apenasNumeros(formulario.whatsapp),
          valor_estimado: Number(
            formulario.valor_estimado || 0,
          ),
        }),
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          resultado.mensagem ||
            "Não foi possível salvar o Lead.",
        );
      }

      setMensagem(resultado.mensagem);
      fecharModal();
      await carregarLeads();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro desconhecido ao salvar Lead.",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function excluirLead(lead: Lead) {
    const identificacao =
      lead.empresa || lead.responsavel || `Lead ${lead.id}`;

    const confirmado = window.confirm(
      `Excluir definitivamente "${identificacao}"?`,
    );

    if (!confirmado) {
      return;
    }

    try {
      setErro(null);
      setMensagem(null);

      const resposta = await fetch(`/api/leads/${lead.id}`, {
        method: "DELETE",
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          resultado.mensagem ||
            "Não foi possível excluir o Lead.",
        );
      }

      setMensagem(resultado.mensagem);
      await carregarLeads();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro desconhecido ao excluir Lead.",
      );
    }
  }

  return (
    <div className="velon-leads-page">
      <section className="velon-leads-header">
        <div>
          <p className="velon-eyebrow">CRM Comercial</p>
          <h1>Gestão de Leads</h1>
          <p>
            Cadastre, acompanhe e converta oportunidades
            comerciais da VelON IA.
          </p>
        </div>

        <button
          type="button"
          className="velon-button velon-button-primary"
          onClick={abrirNovoLead}
        >
          + Novo Lead
        </button>
      </section>

      <section className="velon-leads-indicators">
        <article className="velon-lead-indicator">
          <span>Total de Leads</span>
          <strong>{indicadores.total}</strong>
          <small>Base comercial cadastrada</small>
        </article>

        <article className="velon-lead-indicator">
          <span>Novos Leads</span>
          <strong>{indicadores.novos}</strong>
          <small>Aguardando primeiro contato</small>
        </article>

        <article className="velon-lead-indicator">
          <span>Leads quentes</span>
          <strong>{indicadores.quentes}</strong>
          <small>Maior chance de conversão</small>
        </article>

        <article className="velon-lead-indicator">
          <span>Pipeline estimado</span>
          <strong>{moeda(indicadores.valor)}</strong>
          <small>Valor potencial da carteira</small>
        </article>
      </section>

      {mensagem && (
        <div className="velon-lead-alert velon-lead-alert-success">
          {mensagem}
        </div>
      )}

      {erro && (
        <div className="velon-lead-alert velon-lead-alert-error">
          {erro}
        </div>
      )}

      <section className="velon-leads-toolbar">
        <input
          type="search"
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          placeholder="Pesquisar empresa, responsável ou WhatsApp..."
        />

        <select
          value={filtroStatus}
          onChange={(event) =>
            setFiltroStatus(event.target.value)
          }
        >
          <option value="">Todos os status</option>
          {statusDisponiveis.map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </select>

        <select
          value={filtroTemperatura}
          onChange={(event) =>
            setFiltroTemperatura(event.target.value)
          }
        >
          <option value="">Todas as temperaturas</option>
          {temperaturas.map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </select>

        <select
          value={filtroVendedor}
          onChange={(event) =>
            setFiltroVendedor(event.target.value)
          }
        >
          <option value="">Todos os vendedores</option>
          {vendedores.map((vendedor) => (
            <option key={vendedor.id} value={vendedor.id}>
              {vendedor.nome}
            </option>
          ))}
        </select>
      </section>

      <section className="velon-leads-table-panel">
        {carregando ? (
          <div className="velon-leads-empty">
            Carregando Leads...
          </div>
        ) : leadsFiltrados.length === 0 ? (
          <div className="velon-leads-empty">
            <strong>Nenhum Lead encontrado.</strong>
            <span>
              Cadastre o primeiro prospecto comercial da VelON.
            </span>
          </div>
        ) : (
          <div className="velon-leads-table-wrapper">
            <table className="velon-leads-table">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Contato</th>
                  <th>Status</th>
                  <th>Temperatura</th>
                  <th>Vendedor</th>
                  <th>Valor estimado</th>
                  <th>Próximo contato</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {leadsFiltrados.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <div className="velon-lead-main">
                        <strong>
                          {lead.empresa ||
                            lead.responsavel ||
                            `Lead ${lead.id}`}
                        </strong>

                        <span>
                          {[lead.segmento, lead.cidade, lead.estado]
                            .filter(Boolean)
                            .join(" • ") || "Sem classificação"}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className="velon-lead-main">
                        <strong>
                          {lead.responsavel || "Não informado"}
                        </strong>

                        {lead.whatsapp ? (
                          <a
                            href={`https://wa.me/55${apenasNumeros(
                              lead.whatsapp,
                            ).replace(/^55/, "")}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {lead.whatsapp}
                          </a>
                        ) : (
                          <span>Sem WhatsApp</span>
                        )}
                      </div>
                    </td>

                    <td>
                      <span className={classeStatus(lead.status)}>
                        {rotuloStatus(lead.status)}
                      </span>
                    </td>

                    <td>
                      <span
                        className={classeTemperatura(
                          lead.temperatura,
                        )}
                      >
                        {rotuloTemperatura(lead.temperatura)}
                      </span>
                    </td>

                    <td>
                      {lead.vendedor_nome || "Não atribuído"}
                    </td>

                    <td>
                      <strong>
                        {moeda(lead.valor_estimado)}
                      </strong>
                    </td>

                    <td>
                      {dataExibicao(lead.proximo_contato)}
                    </td>

                    <td>
                      <div className="velon-lead-actions">
                        <button
                          type="button"
                          onClick={() => abrirEdicao(lead)}
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          className="velon-lead-delete"
                          onClick={() => excluirLead(lead)}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalAberto && (
        <div
          className="velon-lead-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              fecharModal();
            }
          }}
        >
          <section
            className="velon-lead-modal"
            role="dialog"
            aria-modal="true"
            aria-label={
              leadEditando ? "Editar Lead" : "Novo Lead"
            }
          >
            <div className="velon-lead-modal-header">
              <div>
                <p className="velon-eyebrow">
                  {leadEditando ? "Atualização" : "Novo cadastro"}
                </p>

                <h2>
                  {leadEditando
                    ? "Editar Lead"
                    : "Cadastrar novo Lead"}
                </h2>
              </div>

              <button
                type="button"
                onClick={fecharModal}
                aria-label="Fechar formulário"
              >
                ×
              </button>
            </div>

            <form
              className="velon-lead-form"
              onSubmit={salvarLead}
            >
              <label>
                Empresa
                <input
                  value={formulario.empresa}
                  onChange={(event) =>
                    atualizarCampo("empresa", event.target.value)
                  }
                  placeholder="Nome da empresa"
                />
              </label>

              <label>
                Responsável
                <input
                  value={formulario.responsavel}
                  onChange={(event) =>
                    atualizarCampo(
                      "responsavel",
                      event.target.value,
                    )
                  }
                  placeholder="Nome do contato"
                />
              </label>

              <label>
                WhatsApp
                <input
                  value={formulario.whatsapp}
                  onChange={(event) =>
                    atualizarCampo(
                      "whatsapp",
                      event.target.value,
                    )
                  }
                  placeholder="41999999999"
                />
              </label>

              <label>
                E-mail
                <input
                  type="email"
                  value={formulario.email}
                  onChange={(event) =>
                    atualizarCampo("email", event.target.value)
                  }
                  placeholder="contato@empresa.com.br"
                />
              </label>

              <label>
                Segmento
                <input
                  value={formulario.segmento}
                  onChange={(event) =>
                    atualizarCampo(
                      "segmento",
                      event.target.value,
                    )
                  }
                  placeholder="Ex.: Autopeças"
                />
              </label>

              <label>
                Cidade
                <input
                  value={formulario.cidade}
                  onChange={(event) =>
                    atualizarCampo("cidade", event.target.value)
                  }
                  placeholder="Curitiba"
                />
              </label>

              <label>
                Estado
                <input
                  value={formulario.estado}
                  onChange={(event) =>
                    atualizarCampo(
                      "estado",
                      event.target.value
                        .toUpperCase()
                        .slice(0, 2),
                    )
                  }
                  maxLength={2}
                  placeholder="PR"
                />
              </label>

              <label>
                Origem
                <input
                  value={formulario.origem}
                  onChange={(event) =>
                    atualizarCampo("origem", event.target.value)
                  }
                  placeholder="Prospecção ativa"
                />
              </label>

              <label>
                Temperatura
                <select
                  value={formulario.temperatura}
                  onChange={(event) =>
                    atualizarCampo(
                      "temperatura",
                      event.target.value,
                    )
                  }
                >
                  {temperaturas.map(([valor, rotulo]) => (
                    <option key={valor} value={valor}>
                      {rotulo}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Status
                <select
                  value={formulario.status}
                  onChange={(event) =>
                    atualizarCampo("status", event.target.value)
                  }
                >
                  {statusDisponiveis.map(([valor, rotulo]) => (
                    <option key={valor} value={valor}>
                      {rotulo}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Vendedor
                <select
                  value={formulario.vendedor_id}
                  onChange={(event) =>
                    atualizarCampo(
                      "vendedor_id",
                      event.target.value,
                    )
                  }
                >
                  <option value="">Não atribuído</option>

                  {vendedores.map((vendedor) => (
                    <option
                      key={vendedor.id}
                      value={vendedor.id}
                    >
                      {vendedor.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Valor estimado
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formulario.valor_estimado}
                  onChange={(event) =>
                    atualizarCampo(
                      "valor_estimado",
                      event.target.value,
                    )
                  }
                  placeholder="4900.00"
                />
              </label>

              <label>
                Último contato
                <input
                  type="datetime-local"
                  value={formulario.ultimo_contato}
                  onChange={(event) =>
                    atualizarCampo(
                      "ultimo_contato",
                      event.target.value,
                    )
                  }
                />
              </label>

              <label>
                Próximo contato
                <input
                  type="datetime-local"
                  value={formulario.proximo_contato}
                  onChange={(event) =>
                    atualizarCampo(
                      "proximo_contato",
                      event.target.value,
                    )
                  }
                />
              </label>

              <label className="velon-lead-form-full">
                Observações
                <textarea
                  value={formulario.observacoes}
                  onChange={(event) =>
                    atualizarCampo(
                      "observacoes",
                      event.target.value,
                    )
                  }
                  rows={4}
                  placeholder="Necessidades, dores e informações comerciais..."
                />
              </label>

              <div className="velon-lead-form-actions">
                <button
                  type="button"
                  className="velon-button"
                  onClick={fecharModal}
                  disabled={salvando}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="velon-button velon-button-primary"
                  disabled={salvando}
                >
                  {salvando
                    ? "Salvando..."
                    : leadEditando
                      ? "Salvar alterações"
                      : "Cadastrar Lead"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
