BEGIN;

CREATE TABLE IF NOT EXISTS comercial.eventos_whatsapp (
    id BIGSERIAL PRIMARY KEY,

    empresa_id BIGINT,
    instancia VARCHAR(100),

    evento VARCHAR(100) NOT NULL,
    mensagem_id VARCHAR(255),

    contato VARCHAR(100),
    de_mim BOOLEAN NOT NULL DEFAULT FALSE,

    texto TEXT,
    payload JSONB NOT NULL,

    processado BOOLEAN NOT NULL DEFAULT FALSE,
    erro TEXT,

    recebido_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processado_em TIMESTAMPTZ,

    CONSTRAINT eventos_whatsapp_empresa_fk
        FOREIGN KEY (empresa_id)
        REFERENCES crm.empresas(id)
        ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS eventos_whatsapp_mensagem_unique
    ON comercial.eventos_whatsapp (instancia, mensagem_id)
    WHERE mensagem_id IS NOT NULL
      AND mensagem_id <> '';

CREATE INDEX IF NOT EXISTS idx_eventos_whatsapp_evento
    ON comercial.eventos_whatsapp (evento);

CREATE INDEX IF NOT EXISTS idx_eventos_whatsapp_contato
    ON comercial.eventos_whatsapp (contato);

CREATE INDEX IF NOT EXISTS idx_eventos_whatsapp_processado
    ON comercial.eventos_whatsapp (processado);

CREATE INDEX IF NOT EXISTS idx_eventos_whatsapp_recebido
    ON comercial.eventos_whatsapp (recebido_em DESC);

COMMIT;
