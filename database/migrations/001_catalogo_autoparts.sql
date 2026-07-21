BEGIN;

CREATE SCHEMA IF NOT EXISTS catalogo;

CREATE TABLE IF NOT EXISTS catalogo.categorias (
    id BIGSERIAL PRIMARY KEY,
    empresa_id BIGINT NOT NULL,
    nome VARCHAR(120) NOT NULL,
    descricao TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ativo',
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT categorias_empresa_fk
        FOREIGN KEY (empresa_id)
        REFERENCES crm.empresas(id)
        ON DELETE RESTRICT,

    CONSTRAINT categorias_status_check
        CHECK (status IN ('ativo', 'inativo')),

    CONSTRAINT categorias_empresa_nome_unique
        UNIQUE (empresa_id, nome)
);

CREATE INDEX IF NOT EXISTS idx_categorias_empresa
    ON catalogo.categorias (empresa_id);

CREATE INDEX IF NOT EXISTS idx_categorias_status
    ON catalogo.categorias (status);


CREATE TABLE IF NOT EXISTS catalogo.marcas (
    id BIGSERIAL PRIMARY KEY,
    empresa_id BIGINT NOT NULL,
    nome VARCHAR(120) NOT NULL,
    fabricante VARCHAR(150),
    descricao TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ativo',
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT marcas_empresa_fk
        FOREIGN KEY (empresa_id)
        REFERENCES crm.empresas(id)
        ON DELETE RESTRICT,

    CONSTRAINT marcas_status_check
        CHECK (status IN ('ativo', 'inativo')),

    CONSTRAINT marcas_empresa_nome_unique
        UNIQUE (empresa_id, nome)
);

CREATE INDEX IF NOT EXISTS idx_marcas_empresa
    ON catalogo.marcas (empresa_id);

CREATE INDEX IF NOT EXISTS idx_marcas_status
    ON catalogo.marcas (status);


CREATE TABLE IF NOT EXISTS catalogo.produtos (
    id BIGSERIAL PRIMARY KEY,
    empresa_id BIGINT NOT NULL,
    categoria_id BIGINT,
    marca_id BIGINT,

    codigo_interno VARCHAR(100) NOT NULL,
    codigo_fabricante VARCHAR(120),
    ean VARCHAR(30),
    descricao VARCHAR(255) NOT NULL,
    descricao_completa TEXT,

    fabricante VARCHAR(150),
    ncm VARCHAR(20),

    preco NUMERIC(14,2) NOT NULL DEFAULT 0,
    preco_promocional NUMERIC(14,2),
    custo NUMERIC(14,2),

    estoque NUMERIC(14,3) NOT NULL DEFAULT 0,
    estoque_minimo NUMERIC(14,3) NOT NULL DEFAULT 0,
    unidade VARCHAR(20) NOT NULL DEFAULT 'UN',

    peso_kg NUMERIC(10,3),
    localizacao VARCHAR(100),
    imagem_url TEXT,

    permite_venda_sem_estoque BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'ativo',

    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT produtos_empresa_fk
        FOREIGN KEY (empresa_id)
        REFERENCES crm.empresas(id)
        ON DELETE RESTRICT,

    CONSTRAINT produtos_categoria_fk
        FOREIGN KEY (categoria_id)
        REFERENCES catalogo.categorias(id)
        ON DELETE SET NULL,

    CONSTRAINT produtos_marca_fk
        FOREIGN KEY (marca_id)
        REFERENCES catalogo.marcas(id)
        ON DELETE SET NULL,

    CONSTRAINT produtos_status_check
        CHECK (status IN ('ativo', 'inativo')),

    CONSTRAINT produtos_preco_check
        CHECK (preco >= 0),

    CONSTRAINT produtos_estoque_check
        CHECK (estoque >= 0),

    CONSTRAINT produtos_empresa_codigo_unique
        UNIQUE (empresa_id, codigo_interno)
);

CREATE INDEX IF NOT EXISTS idx_produtos_empresa
    ON catalogo.produtos (empresa_id);

CREATE INDEX IF NOT EXISTS idx_produtos_categoria
    ON catalogo.produtos (categoria_id);

CREATE INDEX IF NOT EXISTS idx_produtos_marca
    ON catalogo.produtos (marca_id);

CREATE INDEX IF NOT EXISTS idx_produtos_codigo_fabricante
    ON catalogo.produtos (codigo_fabricante);

CREATE INDEX IF NOT EXISTS idx_produtos_ean
    ON catalogo.produtos (ean);

CREATE INDEX IF NOT EXISTS idx_produtos_descricao
    ON catalogo.produtos
    USING GIN (to_tsvector('portuguese', descricao));

CREATE INDEX IF NOT EXISTS idx_produtos_status
    ON catalogo.produtos (status);


CREATE TABLE IF NOT EXISTS catalogo.veiculos (
    id BIGSERIAL PRIMARY KEY,
    montadora VARCHAR(100) NOT NULL,
    modelo VARCHAR(120) NOT NULL,
    versao VARCHAR(150),
    motor VARCHAR(100),
    combustivel VARCHAR(50),
    ano_inicial SMALLINT,
    ano_final SMALLINT,
    observacoes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ativo',
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT veiculos_status_check
        CHECK (status IN ('ativo', 'inativo')),

    CONSTRAINT veiculos_anos_check
        CHECK (
            ano_inicial IS NULL
            OR ano_final IS NULL
            OR ano_final >= ano_inicial
        ),

    CONSTRAINT veiculos_identificacao_unique
        UNIQUE (
            montadora,
            modelo,
            versao,
            motor,
            combustivel,
            ano_inicial,
            ano_final
        )
);

CREATE INDEX IF NOT EXISTS idx_veiculos_montadora
    ON catalogo.veiculos (montadora);

CREATE INDEX IF NOT EXISTS idx_veiculos_modelo
    ON catalogo.veiculos (modelo);

CREATE INDEX IF NOT EXISTS idx_veiculos_motor
    ON catalogo.veiculos (motor);


CREATE TABLE IF NOT EXISTS catalogo.produto_aplicacoes (
    id BIGSERIAL PRIMARY KEY,
    produto_id BIGINT NOT NULL,
    veiculo_id BIGINT NOT NULL,
    observacoes TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT produto_aplicacoes_produto_fk
        FOREIGN KEY (produto_id)
        REFERENCES catalogo.produtos(id)
        ON DELETE CASCADE,

    CONSTRAINT produto_aplicacoes_veiculo_fk
        FOREIGN KEY (veiculo_id)
        REFERENCES catalogo.veiculos(id)
        ON DELETE CASCADE,

    CONSTRAINT produto_aplicacoes_unique
        UNIQUE (produto_id, veiculo_id)
);

CREATE INDEX IF NOT EXISTS idx_produto_aplicacoes_produto
    ON catalogo.produto_aplicacoes (produto_id);

CREATE INDEX IF NOT EXISTS idx_produto_aplicacoes_veiculo
    ON catalogo.produto_aplicacoes (veiculo_id);

COMMIT;
