BEGIN;

CREATE SCHEMA IF NOT EXISTS dashboard;

CREATE OR REPLACE VIEW dashboard.vw_desempenho_vendedores AS
WITH metas_mes AS (
    SELECT
        vendedor_id,
        meta_implantacao,
        meta_mrr,
        meta_clientes
    FROM comercial.metas
    WHERE competencia = DATE_TRUNC('month', CURRENT_DATE)::DATE
),
leads_resumo AS (
    SELECT
        vendedor_id,
        COUNT(*) AS total_leads,
        COUNT(*) FILTER (WHERE temperatura = 'quente') AS leads_quentes
    FROM comercial.leads
    GROUP BY vendedor_id
),
oportunidades_resumo AS (
    SELECT
        vendedor_id,
        COUNT(*) AS total_oportunidades,
        COUNT(*) FILTER (WHERE status = 'aberta') AS oportunidades_abertas,
        COALESCE(SUM(valor) FILTER (WHERE status = 'aberta'), 0) AS pipeline_aberto
    FROM comercial.oportunidades
    GROUP BY vendedor_id
),
propostas_resumo AS (
    SELECT
        vendedor_id,
        COUNT(*) AS total_propostas,
        COUNT(*) FILTER (WHERE status = 'aprovada') AS propostas_aprovadas,
        COALESCE(
            SUM(valor_implantacao) FILTER (WHERE status = 'aprovada'),
            0
        ) AS implantacao_aprovada,
        COALESCE(
            SUM(mensalidade) FILTER (WHERE status = 'aprovada'),
            0
        ) AS mrr_aprovado
    FROM comercial.propostas
    GROUP BY vendedor_id
),
contratos_resumo AS (
    SELECT
        vendedor_id,
        COUNT(*) AS total_contratos,
        COUNT(*) FILTER (WHERE status = 'ativo') AS contratos_ativos,
        COALESCE(
            SUM(valor_implantacao) FILTER (WHERE status = 'ativo'),
            0
        ) AS implantacao_vendida,
        COALESCE(
            SUM(mensalidade) FILTER (WHERE status = 'ativo'),
            0
        ) AS mrr_vendido
    FROM comercial.contratos
    GROUP BY vendedor_id
),
comissoes_resumo AS (
    SELECT
        vendedor_id,
        COALESCE(SUM(valor_comissao), 0) AS comissao_gerada,
        COALESCE(
            SUM(valor_comissao) FILTER (WHERE status = 'pago'),
            0
        ) AS comissao_paga
    FROM financeiro.comissoes
    GROUP BY vendedor_id
)
SELECT
    v.id AS vendedor_id,
    v.nome AS vendedor,
    v.email,
    v.status,
    DATE_TRUNC('month', CURRENT_DATE)::DATE AS competencia,

    COALESCE(m.meta_implantacao, 0) AS meta_implantacao,
    COALESCE(m.meta_mrr, 0) AS meta_mrr,
    COALESCE(m.meta_clientes, 0) AS meta_clientes,

    COALESCE(l.total_leads, 0) AS total_leads,
    COALESCE(l.leads_quentes, 0) AS leads_quentes,

    COALESCE(o.total_oportunidades, 0) AS total_oportunidades,
    COALESCE(o.oportunidades_abertas, 0) AS oportunidades_abertas,
    COALESCE(o.pipeline_aberto, 0) AS pipeline_aberto,

    COALESCE(p.total_propostas, 0) AS total_propostas,
    COALESCE(p.propostas_aprovadas, 0) AS propostas_aprovadas,
    COALESCE(p.implantacao_aprovada, 0) AS implantacao_aprovada,
    COALESCE(p.mrr_aprovado, 0) AS mrr_aprovado,

    COALESCE(c.total_contratos, 0) AS total_contratos,
    COALESCE(c.contratos_ativos, 0) AS contratos_ativos,
    COALESCE(c.implantacao_vendida, 0) AS implantacao_vendida,
    COALESCE(c.mrr_vendido, 0) AS mrr_vendido,

    COALESCE(fc.comissao_gerada, 0) AS comissao_gerada,
    COALESCE(fc.comissao_paga, 0) AS comissao_paga,

    CASE
        WHEN COALESCE(m.meta_implantacao, 0) > 0
        THEN ROUND(
            COALESCE(c.implantacao_vendida, 0)
            / m.meta_implantacao
            * 100,
            2
        )
        ELSE 0
    END AS percentual_meta_implantacao,

    CASE
        WHEN COALESCE(l.total_leads, 0) > 0
        THEN ROUND(
            COALESCE(c.total_contratos, 0)::NUMERIC
            / l.total_leads
            * 100,
            2
        )
        ELSE 0
    END AS taxa_conversao

FROM comercial.vendedores v
LEFT JOIN metas_mes m
    ON m.vendedor_id = v.id
LEFT JOIN leads_resumo l
    ON l.vendedor_id = v.id
LEFT JOIN oportunidades_resumo o
    ON o.vendedor_id = v.id
LEFT JOIN propostas_resumo p
    ON p.vendedor_id = v.id
LEFT JOIN contratos_resumo c
    ON c.vendedor_id = v.id
LEFT JOIN comissoes_resumo fc
    ON fc.vendedor_id = v.id
WHERE v.status = 'ativo';

COMMIT;
