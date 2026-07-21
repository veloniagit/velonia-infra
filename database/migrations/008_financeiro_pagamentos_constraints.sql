BEGIN;

-- Relacionamento com a empresa
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'pagamentos_empresa_fk'
    ) THEN
        ALTER TABLE financeiro.pagamentos
            ADD CONSTRAINT pagamentos_empresa_fk
            FOREIGN KEY (empresa_id)
            REFERENCES crm.empresas(id)
            ON DELETE RESTRICT;
    END IF;
END
$$;

-- Relacionamento com o cliente
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'pagamentos_cliente_fk'
    ) THEN
        ALTER TABLE financeiro.pagamentos
            ADD CONSTRAINT pagamentos_cliente_fk
            FOREIGN KEY (cliente_id)
            REFERENCES crm.clientes(id)
            ON DELETE SET NULL;
    END IF;
END
$$;

-- Relacionamento com a proposta/orçamento
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'pagamentos_proposta_fk'
    ) THEN
        ALTER TABLE financeiro.pagamentos
            ADD CONSTRAINT pagamentos_proposta_fk
            FOREIGN KEY (proposta_id)
            REFERENCES comercial.propostas(id)
            ON DELETE SET NULL;
    END IF;
END
$$;

-- O valor precisa ser maior que zero
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'pagamentos_valor_check'
    ) THEN
        ALTER TABLE financeiro.pagamentos
            ADD CONSTRAINT pagamentos_valor_check
            CHECK (valor > 0);
    END IF;
END
$$;

-- Formas de pagamento inicialmente aceitas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'pagamentos_forma_check'
    ) THEN
        ALTER TABLE financeiro.pagamentos
            ADD CONSTRAINT pagamentos_forma_check
            CHECK (
                forma_pagamento IN (
                    'pix',
                    'cartao',
                    'boleto'
                )
            );
    END IF;
END
$$;

-- Estados possíveis do pagamento
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'pagamentos_status_check'
    ) THEN
        ALTER TABLE financeiro.pagamentos
            ADD CONSTRAINT pagamentos_status_check
            CHECK (
                status IN (
                    'pendente',
                    'processando',
                    'pago',
                    'expirado',
                    'cancelado',
                    'estornado',
                    'falhou'
                )
            );
    END IF;
END
$$;

-- Evita duplicidade de TXID
CREATE UNIQUE INDEX IF NOT EXISTS pagamentos_txid_unique
    ON financeiro.pagamentos (txid)
    WHERE txid IS NOT NULL
      AND txid <> '';

CREATE INDEX IF NOT EXISTS idx_pagamentos_empresa
    ON financeiro.pagamentos (empresa_id);

CREATE INDEX IF NOT EXISTS idx_pagamentos_proposta
    ON financeiro.pagamentos (proposta_id);

CREATE INDEX IF NOT EXISTS idx_pagamentos_criado_em
    ON financeiro.pagamentos (criado_em DESC);

COMMIT;
