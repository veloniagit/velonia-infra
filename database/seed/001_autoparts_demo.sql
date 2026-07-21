BEGIN;

INSERT INTO catalogo.categorias (
    empresa_id,
    nome,
    descricao,
    status
)
VALUES (
    1,
    'Arrefecimento',
    'Radiadores, reservatórios, válvulas, mangueiras e componentes do sistema de arrefecimento.',
    'ativo'
)
ON CONFLICT (empresa_id, nome)
DO UPDATE SET
    descricao = EXCLUDED.descricao,
    status = EXCLUDED.status,
    atualizado_em = NOW();

INSERT INTO catalogo.marcas (
    empresa_id,
    nome,
    fabricante,
    descricao,
    status
)
VALUES (
    1,
    'Valeo',
    'Valeo',
    'Fabricante de componentes automotivos.',
    'ativo'
)
ON CONFLICT (empresa_id, nome)
DO UPDATE SET
    fabricante = EXCLUDED.fabricante,
    descricao = EXCLUDED.descricao,
    status = EXCLUDED.status,
    atualizado_em = NOW();

INSERT INTO catalogo.veiculos (
    montadora,
    modelo,
    versao,
    motor,
    combustivel,
    ano_inicial,
    ano_final,
    observacoes,
    status
)
SELECT
    'Peugeot',
    '207',
    'Hatch',
    '1.4',
    'Flex',
    2009,
    2014,
    'Aplicação de demonstração do VelON AutoParts AI.',
    'ativo'
WHERE NOT EXISTS (
    SELECT 1
    FROM catalogo.veiculos
    WHERE montadora = 'Peugeot'
      AND modelo = '207'
      AND versao = 'Hatch'
      AND motor = '1.4'
      AND combustivel = 'Flex'
      AND ano_inicial = 2009
      AND ano_final = 2014
);

INSERT INTO catalogo.produtos (
    empresa_id,
    categoria_id,
    marca_id,
    codigo_interno,
    codigo_fabricante,
    ean,
    descricao,
    descricao_completa,
    fabricante,
    ncm,
    preco,
    preco_promocional,
    custo,
    estoque,
    estoque_minimo,
    unidade,
    peso_kg,
    localizacao,
    permite_venda_sem_estoque,
    status
)
VALUES (
    1,
    (
        SELECT id
        FROM catalogo.categorias
        WHERE empresa_id = 1
          AND nome = 'Arrefecimento'
        LIMIT 1
    ),
    (
        SELECT id
        FROM catalogo.marcas
        WHERE empresa_id = 1
          AND nome = 'Valeo'
        LIMIT 1
    ),
    'RAD-PEU-207-14',
    'VALEO-207-14',
    '7890000002071',
    'Radiador Peugeot 207 1.4 Flex',
    'Radiador do motor para Peugeot 207 Hatch, motor 1.4 Flex, anos 2009 a 2014.',
    'Valeo',
    '87089100',
    589.00,
    549.00,
    380.00,
    8,
    2,
    'UN',
    4.850,
    'A1-P03',
    FALSE,
    'ativo'
)
ON CONFLICT (empresa_id, codigo_interno)
DO UPDATE SET
    categoria_id = EXCLUDED.categoria_id,
    marca_id = EXCLUDED.marca_id,
    codigo_fabricante = EXCLUDED.codigo_fabricante,
    ean = EXCLUDED.ean,
    descricao = EXCLUDED.descricao,
    descricao_completa = EXCLUDED.descricao_completa,
    fabricante = EXCLUDED.fabricante,
    ncm = EXCLUDED.ncm,
    preco = EXCLUDED.preco,
    preco_promocional = EXCLUDED.preco_promocional,
    custo = EXCLUDED.custo,
    estoque = EXCLUDED.estoque,
    estoque_minimo = EXCLUDED.estoque_minimo,
    unidade = EXCLUDED.unidade,
    peso_kg = EXCLUDED.peso_kg,
    localizacao = EXCLUDED.localizacao,
    permite_venda_sem_estoque = EXCLUDED.permite_venda_sem_estoque,
    status = EXCLUDED.status,
    atualizado_em = NOW();

INSERT INTO catalogo.produto_aplicacoes (
    produto_id,
    veiculo_id,
    observacoes
)
VALUES (
    (
        SELECT id
        FROM catalogo.produtos
        WHERE empresa_id = 1
          AND codigo_interno = 'RAD-PEU-207-14'
        LIMIT 1
    ),
    (
        SELECT id
        FROM catalogo.veiculos
        WHERE montadora = 'Peugeot'
          AND modelo = '207'
          AND motor = '1.4'
          AND combustivel = 'Flex'
          AND ano_inicial = 2009
          AND ano_final = 2014
        ORDER BY id
        LIMIT 1
    ),
    'Aplicação confirmada para Peugeot 207 1.4 Flex, anos 2009 a 2014.'
)
ON CONFLICT (produto_id, veiculo_id)
DO UPDATE SET
    observacoes = EXCLUDED.observacoes;

COMMIT;
