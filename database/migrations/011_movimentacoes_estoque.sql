BEGIN;

CREATE TABLE IF NOT EXISTS catalogo.movimentacoes_estoque (
    id BIGSERIAL PRIMARY KEY,

    empresa_id BIGINT NOT NULL,
    produto_id BIGINT NOT NULL,
    pedido_id BIGINT,

    tipo VARCHAR(30) NOT NULL,
    quantidade NUMERIC(14,3) NOT NULL,

    estoque_anterior NUMERIC(14,3) NOT NULL,
    estoque_posterior NUMERIC(14,3) NOT NULL,

    referencia VARCHAR(100),
    observacoes TEXT,

    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT movimentacoes_estoque_empresa_fk
        FOREIGN KEY (empresa_id)
        REFERENCES crm.empresas(id)
        ON DELETE RESTRICT,

    CONSTRAINT movimentacoes_estoque_produto_fk
        FOREIGN KEY (produto_id)
        REFERENCES catalogo.produtos(id)
        ON DELETE RESTRICT,

    CONSTRAINT movimentacoes_estoque_pedido_fk
        FOREIGN KEY (pedido_id)
        REFERENCES comercial.pedidos(id)
        ON DELETE SET NULL,

    CONSTRAINT movimentacoes_estoque_tipo_check
        CHECK (
            tipo IN (
                'entrada',
                'saida_venda',
                'ajuste_positivo',
                'ajuste_negativo',
                'devolucao',
                'cancelamento'
            )
        ),

    CONSTRAINT movimentacoes_estoque_quantidade_check
        CHECK (quantidade > 0),

    CONSTRAINT movimentacoes_estoque_saldo_check
        CHECK (
            estoque_anterior >= 0
            AND estoque_posterior >= 0
        )
);

CREATE INDEX IF NOT EXISTS idx_movimentacoes_estoque_empresa
    ON catalogo.movimentacoes_estoque (empresa_id);

CREATE INDEX IF NOT EXISTS idx_movimentacoes_estoque_produto
    ON catalogo.movimentacoes_estoque (produto_id);

CREATE INDEX IF NOT EXISTS idx_movimentacoes_estoque_pedido
    ON catalogo.movimentacoes_estoque (pedido_id);

CREATE INDEX IF NOT EXISTS idx_movimentacoes_estoque_criado_em
    ON catalogo.movimentacoes_estoque (criado_em DESC);

COMMIT;
