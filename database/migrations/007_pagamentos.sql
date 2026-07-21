BEGIN;

CREATE SCHEMA IF NOT EXISTS financeiro;

CREATE TABLE financeiro.pagamentos (

    id BIGSERIAL PRIMARY KEY,

    empresa_id BIGINT NOT NULL,

    cliente_id BIGINT,

    proposta_id BIGINT,

    pedido_id BIGINT,

    forma_pagamento VARCHAR(30) NOT NULL,

    valor NUMERIC(14,2) NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'pendente',

    codigo_pix TEXT,

    qr_code TEXT,

    txid VARCHAR(120),

    gateway VARCHAR(50),

    pago_em TIMESTAMPTZ,

    criado_em TIMESTAMPTZ DEFAULT NOW(),

    atualizado_em TIMESTAMPTZ DEFAULT NOW()

);

CREATE INDEX idx_pagamentos_status
ON financeiro.pagamentos(status);

CREATE INDEX idx_pagamentos_cliente
ON financeiro.pagamentos(cliente_id);

COMMIT;
