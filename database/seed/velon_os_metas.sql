INSERT INTO comercial.metas
(
    vendedor_id,
    competencia,
    meta_implantacao,
    meta_mrr,
    meta_clientes,
    observacoes
)
SELECT
    id,
    DATE_TRUNC('month', CURRENT_DATE)::DATE,
    30000.00,
    5000.00,
    5,
    'Meta comercial inicial'
FROM comercial.vendedores
WHERE status = 'ativo'
ON CONFLICT (vendedor_id, competencia) DO UPDATE SET
    meta_implantacao = EXCLUDED.meta_implantacao,
    meta_mrr = EXCLUDED.meta_mrr,
    meta_clientes = EXCLUDED.meta_clientes,
    observacoes = EXCLUDED.observacoes,
    atualizado_em = NOW();
