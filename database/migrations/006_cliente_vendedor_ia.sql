BEGIN;

-- Dados fiscais e de endereço no cliente já existente
ALTER TABLE crm.clientes
    ADD COLUMN IF NOT EXISTS cpf_cnpj VARCHAR(20),
    ADD COLUMN IF NOT EXISTS cep VARCHAR(15),
    ADD COLUMN IF NOT EXISTS endereco TEXT,
    ADD COLUMN IF NOT EXISTS numero VARCHAR(20),
    ADD COLUMN IF NOT EXISTS complemento VARCHAR(100),
    ADD COLUMN IF NOT EXISTS bairro VARCHAR(100),
    ADD COLUMN IF NOT EXISTS cidade VARCHAR(100),
    ADD COLUMN IF NOT EXISTS estado VARCHAR(2);

-- Evita duplicação de documento dentro da mesma empresa
CREATE UNIQUE INDEX IF NOT EXISTS clientes_empresa_cpf_cnpj_unique
    ON crm.clientes (empresa_id, cpf_cnpj)
    WHERE cpf_cnpj IS NOT NULL
      AND cpf_cnpj <> '';

-- Liga a conversa ao cliente identificado
ALTER TABLE comercial.conversas_ia
    ADD COLUMN IF NOT EXISTS cliente_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'conversas_ia_cliente_fk'
    ) THEN
        ALTER TABLE comercial.conversas_ia
            ADD CONSTRAINT conversas_ia_cliente_fk
            FOREIGN KEY (cliente_id)
            REFERENCES crm.clientes(id)
            ON DELETE SET NULL;
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_conversas_ia_cliente
    ON comercial.conversas_ia (cliente_id);

-- Liga o orçamento ao cliente comprador
ALTER TABLE comercial.propostas
    ADD COLUMN IF NOT EXISTS cliente_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'propostas_cliente_fk'
    ) THEN
        ALTER TABLE comercial.propostas
            ADD CONSTRAINT propostas_cliente_fk
            FOREIGN KEY (cliente_id)
            REFERENCES crm.clientes(id)
            ON DELETE SET NULL;
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_propostas_cliente
    ON comercial.propostas (cliente_id);

-- Amplia as etapas permitidas para o vendedor IA
ALTER TABLE comercial.conversas_ia
    DROP CONSTRAINT IF EXISTS conversas_ia_etapa_check;

ALTER TABLE comercial.conversas_ia
    ADD CONSTRAINT conversas_ia_etapa_check
    CHECK (
        etapa IN (
            'inicio',
            'buscando_produto',
            'produto_encontrado',
            'aguardando_quantidade',
            'oferecendo_orcamento',
            'orcamento_criado',
            'aguardando_confirmacao',
            'aguardando_nome',
            'aguardando_documento',
            'aguardando_cep',
            'aguardando_endereco',
            'aguardando_numero',
            'aguardando_pagamento',
            'pagamento_pendente',
            'pagamento_confirmado',
            'pedido_criado',
            'finalizado'
        )
    );

COMMIT;
