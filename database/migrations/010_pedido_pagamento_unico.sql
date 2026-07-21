BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS pedidos_pagamento_unique
    ON comercial.pedidos (pagamento_id)
    WHERE pagamento_id IS NOT NULL;

COMMIT;
