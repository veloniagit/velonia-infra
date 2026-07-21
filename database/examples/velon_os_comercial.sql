BEGIN;

CREATE SCHEMA IF NOT EXISTS crm;
CREATE SCHEMA IF NOT EXISTS comercial;

CREATE TABLE IF NOT EXISTS crm.empresas (
    id BIGSERIAL PRIMARY KEY,
    razao_social VARCHAR(255),
    nome_fantasia VARCHAR(255) NOT NULL,
    cnpj VARCHAR(20) UNIQUE,
    segmento VARCHAR(100),
    telefone VARCHAR(30),
    email VARCHAR(255),
    site VARCHAR(255),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    status VARCHAR(30) NOT NULL DEFAULT 'ativa',
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comercial.vendedores (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE,
    whatsapp VARCHAR(30),
    meta_mensal NUMERIC(14,2) NOT NULL DEFAULT 0,
    percentual_comissao NUMERIC(5,2) NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'ativo',
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm.clientes (
    id BIGSERIAL PRIMARY KEY,
    empresa_id BIGINT NOT NULL REFERENCES crm.empresas(id),
    responsavel VARCHAR(150),
    whatsapp VARCHAR(30),
    email VARCHAR(255),
    plano VARCHAR(100),
    valor_implantacao NUMERIC(14,2) NOT NULL DEFAULT 0,
    mensalidade NUMERIC(14,2) NOT NULL DEFAULT 0,
    data_inicio DATE,
    data_cancelamento DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'ativo',
    observacoes TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comercial.leads (
    id BIGSERIAL PRIMARY KEY,
    empresa VARCHAR(255),
    responsavel VARCHAR(150),
    whatsapp VARCHAR(30),
    email VARCHAR(255),
    segmento VARCHAR(100),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    origem VARCHAR(100),
    temperatura VARCHAR(20) NOT NULL DEFAULT 'frio',
    status VARCHAR(60) NOT NULL DEFAULT 'novo',
    vendedor_id BIGINT REFERENCES comercial.vendedores(id),
    valor_estimado NUMERIC(14,2) NOT NULL DEFAULT 0,
    ultimo_contato TIMESTAMPTZ,
    proximo_contato TIMESTAMPTZ,
    observacoes TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comercial.oportunidades (
    id BIGSERIAL PRIMARY KEY,
    lead_id BIGINT NOT NULL REFERENCES comercial.leads(id),
    vendedor_id BIGINT REFERENCES comercial.vendedores(id),
    titulo VARCHAR(255) NOT NULL,
    etapa VARCHAR(60) NOT NULL DEFAULT 'qualificacao',
    valor NUMERIC(14,2) NOT NULL DEFAULT 0,
    probabilidade INTEGER NOT NULL DEFAULT 0
        CHECK (probabilidade BETWEEN 0 AND 100),
    previsao_fechamento DATE,
    data_fechamento DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'aberta',
    motivo_perda TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clientes_empresa
ON crm.clientes (empresa_id);

CREATE INDEX IF NOT EXISTS idx_leads_vendedor
ON comercial.leads (vendedor_id);

CREATE INDEX IF NOT EXISTS idx_leads_status
ON comercial.leads (status);

CREATE INDEX IF NOT EXISTS idx_oportunidades_vendedor
ON comercial.oportunidades (vendedor_id);

CREATE INDEX IF NOT EXISTS idx_oportunidades_etapa
ON comercial.oportunidades (etapa);

COMMIT;
INSERT INTO comercial.vendedores
(nome,email,whatsapp,meta_mensal,percentual_comissao)
VALUES

('Vendedor 1',
'vendedor1@velonia.com.br',
'47999990001',
50000,
10),

('Vendedor 2',
'vendedor2@velonia.com.br',
'47999990002',
50000,
10),

('Vendedor 3',
'vendedor3@velonia.com.br',
'47999990003',
50000,
10),

('Vendedor 4',
'vendedor4@velonia.com.br',
'47999990004',
50000,
10);
