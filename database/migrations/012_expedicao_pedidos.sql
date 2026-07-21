BEGIN;

ALTER TABLE comercial.pedidos
    ADD COLUMN IF NOT EXISTS modalidade_entrega VARCHAR(30),
    ADD COLUMN IF NOT EXISTS transportadora VARCHAR(150),
    ADD COLUMN IF NOT EXISTS codigo_rastreio VARCHAR(150),
    ADD COLUMN IF NOT EXISTS local_retirada TEXT,
    ADD COLUMN IF NOT EXISTS disponivel_retirada_em TIMESTAMPTZ;

ALTER TABLE comercial.pedidos
    DROP CONSTRAINT IF EXISTS pedidos_status_check;

ALTER TABLE comercial.pedidos
    ADD CONSTRAINT pedidos_status_check
    CHECK (
        status IN (
            'aguardando_pagamento',
            'pago',
            'em_separacao',
            'separado',
            'disponivel_retirada',
            'enviado',
            'concluido',
            'cancelado'
        )
    );

ALTER TABLE comercial.pedidos
    DROP CONSTRAINT IF EXISTS pedidos_modalidade_entrega_check;

ALTER TABLE comercial.pedidos
    ADD CONSTRAINT pedidos_modalidade_entrega_check
    CHECK (
        modalidade_entrega IS NULL
        OR modalidade_entrega IN (
            'entrega',
            'retirada'
        )
    );

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
            'pedido_enviado',
            'disponivel_retirada',
            'finalizado'
        )
    );

CREATE INDEX IF NOT EXISTS idx_pedidos_modalidade_entrega
    ON comercial.pedidos (modalidade_entrega);

CREATE INDEX IF NOT EXISTS idx_pedidos_codigo_rastreio
    ON comercial.pedidos (codigo_rastreio);

COMMIT;
