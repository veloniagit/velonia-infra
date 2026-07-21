BEGIN;

CREATE TABLE IF NOT EXISTS comercial.conversas_ia (
    id BIGSERIAL PRIMARY KEY,

    empresa_id BIGINT NOT NULL,

    canal VARCHAR(30) NOT NULL DEFAULT 'whatsapp',
    contato VARCHAR(50) NOT NULL,

    nome_contato VARCHAR(150),

    etapa VARCHAR(50) NOT NULL DEFAULT 'inicio',

    ultimo_produto_id BIGINT,
    ultima_proposta_id BIGINT,

    quantidade NUMERIC(14,3) NOT NULL DEFAULT 1,

    ultima_mensagem_cliente TEXT,
    ultima_resposta_ia TEXT,

    contexto JSONB NOT NULL DEFAULT '{}'::jsonb,

    expira_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT conversas_ia_empresa_fk
        FOREIGN KEY (empresa_id)
        REFERENCES crm.empresas(id)
        ON DELETE CASCADE,

    CONSTRAINT conversas_ia_produto_fk
        FOREIGN KEY (ultimo_produto_id)
        REFERENCES catalogo.produtos(id)
        ON DELETE SET NULL,

    CONSTRAINT conversas_ia_proposta_fk
        FOREIGN KEY (ultima_proposta_id)
        REFERENCES comercial.propostas(id)
        ON DELETE SET NULL,

    CONSTRAINT conversas_ia_quantidade_check
        CHECK (quantidade > 0),

    CONSTRAINT conversas_ia_etapa_check
        CHECK (
            etapa IN (
                'inicio',
                'buscando_produto',
                'produto_encontrado',
                'aguardando_quantidade',
                'oferecendo_orcamento',
                'orcamento_criado',
                'aguardando_confirmacao',
                'finalizado'
            )
        ),

    CONSTRAINT conversas_ia_empresa_canal_contato_unique
        UNIQUE (empresa_id, canal, contato)
);

CREATE INDEX IF NOT EXISTS idx_conversas_ia_empresa
    ON comercial.conversas_ia (empresa_id);

CREATE INDEX IF NOT EXISTS idx_conversas_ia_contato
    ON comercial.conversas_ia (contato);

CREATE INDEX IF NOT EXISTS idx_conversas_ia_etapa
    ON comercial.conversas_ia (etapa);

CREATE INDEX IF NOT EXISTS idx_conversas_ia_produto
    ON comercial.conversas_ia (ultimo_produto_id);

CREATE INDEX IF NOT EXISTS idx_conversas_ia_proposta
    ON comercial.conversas_ia (ultima_proposta_id);

CREATE INDEX IF NOT EXISTS idx_conversas_ia_atualizado
    ON comercial.conversas_ia (atualizado_em DESC);

COMMIT;
