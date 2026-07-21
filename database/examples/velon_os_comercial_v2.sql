BEGIN;

CREATE SCHEMA IF NOT EXISTS comercial;
CREATE SCHEMA IF NOT EXISTS financeiro;

CREATE TABLE IF NOT EXISTS comercial.metas (
    id BIGSERIAL PRIMARY KEY,
    vendedor_id BIGINT NOT NULL
        REFERENCES comercial.vendedores(id)
        ON DELETE CASCADE,
    competencia DATE NOT NULL,
    meta_implantacao NUMERIC(14,2) NOT NULL DEFAULT 0,
    meta_mrr NUMERIC(14,2) NOT NULL DEFAULT 0,
    meta_clientes INTEGER NOT NULL DEFAULT 0,
    observacoes TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (vendedor_id, competencia)
);

CREATE TABLE IF NOT EXISTS comercial.propostas (
    id BIGSERIAL PRIMARY KEY,
    oportunidade_id BIGINT
        REFERENCES comercial.oportunidades(id)
        ON DELETE SET NULL,
    vendedor_id BIGINT
        REFERENCES comercial.vendedores(id)
        ON DELETE SET NULL,
    numero VARCHAR(50) UNIQUE,
    titulo VARCHAR(255),
    plano VARCHAR(100),
    descricao TEXT,
    valor_implantacao NUMERIC(14,2) NOT NULL DEFAULT 0,
    mensalidade NUMERIC(14,2) NOT NULL DEFAULT 0,
    desconto NUMERIC(14,2) NOT NULL DEFAULT 0,
    valor_total NUMERIC(14,2) NOT NULL DEFAULT 0,
    validade DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'rascunho',
    enviada_em TIMESTAMPTZ,
    aprovada_em TIMESTAMPTZ,
    recusada_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comercial.contratos (
    id BIGSERIAL PRIMARY KEY,
    cliente_id BIGINT
        REFERENCES crm.clientes(id)
        ON DELETE RESTRICT,
    proposta_id BIGINT
        REFERENCES comercial.propostas(id)
        ON DELETE SET NULL,
    vendedor_id BIGINT
        REFERENCES comercial.vendedores(id)
        ON DELETE SET NULL,
    numero VARCHAR(50) UNIQUE,
    plano VARCHAR(100),
    valor_implantacao NUMERIC(14,2) NOT NULL DEFAULT 0,
    mensalidade NUMERIC(14,2) NOT NULL DEFAULT 0,
    data_inicio DATE NOT NULL,
    data_fim DATE,
    dia_vencimento INTEGER
        CHECK (dia_vencimento BETWEEN 1 AND 31),
    status VARCHAR(30) NOT NULL DEFAULT 'ativo',
    link_documento TEXT,
    assinado_em TIMESTAMPTZ,
    cancelado_em TIMESTAMPTZ,
    motivo_cancelamento TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comercial.atividades (
    id BIGSERIAL PRIMARY KEY,
    lead_id BIGINT
        REFERENCES comercial.leads(id)
        ON DELETE CASCADE,
    oportunidade_id BIGINT
        REFERENCES comercial.oportunidades(id)
        ON DELETE CASCADE,
    vendedor_id BIGINT
        REFERENCES comercial.vendedores(id)
        ON DELETE SET NULL,
    tipo VARCHAR(50) NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    agendado_para TIMESTAMPTZ,
    concluido_em TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'pendente',
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financeiro.comissoes (
    id BIGSERIAL PRIMARY KEY,
    vendedor_id BIGINT NOT NULL
        REFERENCES comercial.vendedores(id)
        ON DELETE RESTRICT,
    contrato_id BIGINT
        REFERENCES comercial.contratos(id)
        ON DELETE SET NULL,
    tipo VARCHAR(30) NOT NULL DEFAULT 'implantacao',
    base_calculo NUMERIC(14,2) NOT NULL DEFAULT 0,
    percentual NUMERIC(5,2) NOT NULL DEFAULT 0,
    valor_comissao NUMERIC(14,2) NOT NULL DEFAULT 0,
    competencia DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'pendente',
    pago_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metas_vendedor
ON comercial.metas (vendedor_id);

CREATE INDEX IF NOT EXISTS idx_propostas_vendedor
ON comercial.propostas (vendedor_id);

CREATE INDEX IF NOT EXISTS idx_propostas_status
ON comercial.propostas (status);

CREATE INDEX IF NOT EXISTS idx_contratos_cliente
ON comercial.contratos (cliente_id);

CREATE INDEX IF NOT EXISTS idx_contratos_status
ON comercial.contratos (status);

CREATE INDEX IF NOT EXISTS idx_atividades_vendedor
ON comercial.atividades (vendedor_id);

CREATE INDEX IF NOT EXISTS idx_atividades_status
ON comercial.atividades (status);

CREATE INDEX IF NOT EXISTS idx_comissoes_vendedor
ON financeiro.comissoes (vendedor_id);

CREATE INDEX IF NOT EXISTS idx_comissoes_status
ON financeiro.comissoes (status);

COMMIT;
