BEGIN;

CREATE TABLE IF NOT EXISTS comercial.proposta_itens (
    id BIGSERIAL PRIMARY KEY,

    proposta_id BIGINT NOT NULL,
    produto_id BIGINT,

    codigo_produto VARCHAR(100),
    descricao VARCHAR(255) NOT NULL,

    quantidade NUMERIC(14,3) NOT NULL DEFAULT 1,
    valor_unitario NUMERIC(14,2) NOT NULL DEFAULT 0,
    desconto NUMERIC(14,2) NOT NULL DEFAULT 0,
    valor_total NUMERIC(14,2) NOT NULL DEFAULT 0,

    observacoes TEXT,

    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT proposta_itens_proposta_fk
        FOREIGN KEY (proposta_id)
        REFERENCES comercial.propostas(id)
        ON DELETE CASCADE,

    CONSTRAINT proposta_itens_produto_fk
        FOREIGN KEY (produto_id)
        REFERENCES catalogo.produtos(id)
        ON DELETE SET NULL,

    CONSTRAINT proposta_itens_quantidade_check
        CHECK (quantidade > 0),

    CONSTRAINT proposta_itens_valor_unitario_check
        CHECK (valor_unitario >= 0),

    CONSTRAINT proposta_itens_desconto_check
        CHECK (desconto >= 0),

    CONSTRAINT proposta_itens_valor_total_check
        CHECK (valor_total >= 0)
);

CREATE INDEX IF NOT EXISTS idx_proposta_itens_proposta
    ON comercial.proposta_itens (proposta_id);

CREATE INDEX IF NOT EXISTS idx_proposta_itens_produto
    ON comercial.proposta_itens (produto_id);

COMMIT;
