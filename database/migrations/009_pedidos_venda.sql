BEGIN;

CREATE TABLE IF NOT EXISTS comercial.pedidos (
    id BIGSERIAL PRIMARY KEY,

    empresa_id BIGINT NOT NULL,
    cliente_id BIGINT,
    proposta_id BIGINT,
    pagamento_id BIGINT,

    numero VARCHAR(50) UNIQUE,

    valor_total NUMERIC(14,2) NOT NULL DEFAULT 0,

    status VARCHAR(30) NOT NULL DEFAULT 'aguardando_pagamento',

    forma_pagamento VARCHAR(30),

    cep VARCHAR(15),
    endereco TEXT,
    numero_endereco VARCHAR(20),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    estado VARCHAR(2),

    observacoes TEXT,

    pago_em TIMESTAMPTZ,
    separado_em TIMESTAMPTZ,
    enviado_em TIMESTAMPTZ,
    concluido_em TIMESTAMPTZ,
    cancelado_em TIMESTAMPTZ,

    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pedidos_empresa_fk
        FOREIGN KEY (empresa_id)
        REFERENCES crm.empresas(id)
        ON DELETE RESTRICT,

    CONSTRAINT pedidos_cliente_fk
        FOREIGN KEY (cliente_id)
        REFERENCES crm.clientes(id)
        ON DELETE SET NULL,

    CONSTRAINT pedidos_proposta_fk
        FOREIGN KEY (proposta_id)
        REFERENCES comercial.propostas(id)
        ON DELETE SET NULL,

    CONSTRAINT pedidos_pagamento_fk
        FOREIGN KEY (pagamento_id)
        REFERENCES financeiro.pagamentos(id)
        ON DELETE SET NULL,

    CONSTRAINT pedidos_valor_total_check
        CHECK (valor_total >= 0),

    CONSTRAINT pedidos_forma_pagamento_check
        CHECK (
            forma_pagamento IS NULL
            OR forma_pagamento IN (
                'pix',
                'cartao',
                'boleto'
            )
        ),

    CONSTRAINT pedidos_status_check
        CHECK (
            status IN (
                'aguardando_pagamento',
                'pago',
                'em_separacao',
                'separado',
                'enviado',
                'concluido',
                'cancelado'
            )
        )
);

CREATE TABLE IF NOT EXISTS comercial.pedido_itens (
    id BIGSERIAL PRIMARY KEY,

    pedido_id BIGINT NOT NULL,
    produto_id BIGINT,

    codigo_produto VARCHAR(100),
    descricao VARCHAR(255) NOT NULL,

    quantidade NUMERIC(14,3) NOT NULL DEFAULT 1,
    valor_unitario NUMERIC(14,2) NOT NULL DEFAULT 0,
    desconto NUMERIC(14,2) NOT NULL DEFAULT 0,
    valor_total NUMERIC(14,2) NOT NULL DEFAULT 0,

    status VARCHAR(30) NOT NULL DEFAULT 'aguardando_separacao',

    separado_em TIMESTAMPTZ,

    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pedido_itens_pedido_fk
        FOREIGN KEY (pedido_id)
        REFERENCES comercial.pedidos(id)
        ON DELETE CASCADE,

    CONSTRAINT pedido_itens_produto_fk
        FOREIGN KEY (produto_id)
        REFERENCES catalogo.produtos(id)
        ON DELETE SET NULL,

    CONSTRAINT pedido_itens_quantidade_check
        CHECK (quantidade > 0),

    CONSTRAINT pedido_itens_valor_unitario_check
        CHECK (valor_unitario >= 0),

    CONSTRAINT pedido_itens_desconto_check
        CHECK (desconto >= 0),

    CONSTRAINT pedido_itens_valor_total_check
        CHECK (valor_total >= 0),

    CONSTRAINT pedido_itens_status_check
        CHECK (
            status IN (
                'aguardando_separacao',
                'em_separacao',
                'separado',
                'indisponivel',
                'cancelado'
            )
        )
);

CREATE INDEX IF NOT EXISTS idx_pedidos_empresa
    ON comercial.pedidos (empresa_id);

CREATE INDEX IF NOT EXISTS idx_pedidos_cliente
    ON comercial.pedidos (cliente_id);

CREATE INDEX IF NOT EXISTS idx_pedidos_proposta
    ON comercial.pedidos (proposta_id);

CREATE INDEX IF NOT EXISTS idx_pedidos_pagamento
    ON comercial.pedidos (pagamento_id);

CREATE INDEX IF NOT EXISTS idx_pedidos_status
    ON comercial.pedidos (status);

CREATE INDEX IF NOT EXISTS idx_pedidos_criado_em
    ON comercial.pedidos (criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_pedido_itens_pedido
    ON comercial.pedido_itens (pedido_id);

CREATE INDEX IF NOT EXISTS idx_pedido_itens_produto
    ON comercial.pedido_itens (produto_id);

CREATE INDEX IF NOT EXISTS idx_pedido_itens_status
    ON comercial.pedido_itens (status);

COMMIT;
