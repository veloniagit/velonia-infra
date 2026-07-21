INSERT INTO comercial.vendedores
(
    nome,
    email,
    whatsapp,
    meta_mensal,
    percentual_comissao,
    status
)
VALUES
(
    'Vendedor 1',
    'vendedor1@velonia.com.br',
    '47999990001',
    30000.00,
    10.00,
    'ativo'
),
(
    'Vendedor 2',
    'vendedor2@velonia.com.br',
    '47999990002',
    30000.00,
    10.00,
    'ativo'
),
(
    'Vendedor 3',
    'vendedor3@velonia.com.br',
    '47999990003',
    30000.00,
    10.00,
    'ativo'
),
(
    'Vendedor 4',
    'vendedor4@velonia.com.br',
    '47999990004',
    30000.00,
    10.00,
    'ativo'
)
ON CONFLICT (email) DO UPDATE SET
    nome = EXCLUDED.nome,
    whatsapp = EXCLUDED.whatsapp,
    meta_mensal = EXCLUDED.meta_mensal,
    percentual_comissao = EXCLUDED.percentual_comissao,
    status = EXCLUDED.status,
    atualizado_em = NOW();
