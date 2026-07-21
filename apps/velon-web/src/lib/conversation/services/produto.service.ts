import { getPrisma } from "@/lib/prisma";

export type ProdutoEncontrado = {
  id: bigint;
  empresaId: bigint;
  codigoInterno: string;
  codigoFabricante: string | null;
  codigoOem: string | null;
  descricao: string;
  descricaoCompleta: string | null;
  fabricante: string | null;
  marca: string | null;
  categoria: string | null;
  preco: number;
  precoOriginal: number;
  precoPromocional: number | null;
  estoque: number;
  unidade: string;
  permiteVendaSemEstoque: boolean;
  localizacao: string | null;
  aplicacoes: string[];
  pontuacao: number;
};

type ProdutoBanco = {
  id: bigint;
  empresa_id: bigint;
  codigo_interno: string;
  codigo_fabricante: string | null;
  codigo_oem: string | null;
  descricao: string;
  descricao_completa: string | null;
  fabricante: string | null;
  marca: string | null;
  categoria: string | null;
  preco: string;
  preco_original: string;
  preco_promocional: string | null;
  estoque: string;
  unidade: string;
  permite_venda_sem_estoque: boolean;
  localizacao: string | null;
  aplicacoes: string[] | null;
  pontuacao: bigint;
};

const PALAVRAS_IGNORADAS = new Set([
  "a",
  "ao",
  "aos",
  "as",
  "com",
  "da",
  "das",
  "de",
  "do",
  "dos",
  "e",
  "eu",
  "me",
  "meu",
  "minha",
  "o",
  "os",
  "para",
  "por",
  "preciso",
  "procuro",
  "quero",
  "tem",
  "uma",
  "um",
  "valor",
  "preco",
  "preço",
  "peca",
  "peça",
  "produto",
]);

function normalizar(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}.-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extrairTermosProduto(
  consulta: string,
): string[] {
  const termos = normalizar(consulta)
    .split(" ")
    .map((termo) => termo.trim())
    .filter(Boolean)
    .filter(
      (termo) =>
        termo.length >= 2 &&
        !PALAVRAS_IGNORADAS.has(termo),
    );

  return [...new Set(termos)].slice(0, 12);
}

function mapearProduto(
  produto: ProdutoBanco,
): ProdutoEncontrado {
  return {
    id: produto.id,
    empresaId: produto.empresa_id,
    codigoInterno: produto.codigo_interno,
    codigoFabricante:
      produto.codigo_fabricante,
    codigoOem: produto.codigo_oem,
    descricao: produto.descricao,
    descricaoCompleta:
      produto.descricao_completa,
    fabricante: produto.fabricante,
    marca: produto.marca,
    categoria: produto.categoria,
    preco: Number(produto.preco),
    precoOriginal:
      Number(produto.preco_original),
    precoPromocional:
      produto.preco_promocional === null
        ? null
        : Number(produto.preco_promocional),
    estoque: Number(produto.estoque),
    unidade: produto.unidade,
    permiteVendaSemEstoque:
      produto.permite_venda_sem_estoque,
    localizacao: produto.localizacao,
    aplicacoes: produto.aplicacoes ?? [],
    pontuacao: Number(produto.pontuacao),
  };
}

export async function buscarProdutos(
  empresaId: bigint,
  consulta: string,
  limite = 5,
): Promise<ProdutoEncontrado[]> {
  const prisma = getPrisma();
  const termos = extrairTermosProduto(consulta);

  if (termos.length === 0) {
    return [];
  }

  const termosJson = JSON.stringify(termos);
  const limiteSeguro = Math.min(
    Math.max(Math.trunc(limite), 1),
    20,
  );

  const resultados =
    await prisma.$queryRaw<ProdutoBanco[]>`
      WITH produtos_pesquisa AS (
        SELECT
          p.id,
          p.empresa_id,
          p.codigo_interno,
          p.codigo_fabricante,
          p.codigo_oem,
          p.descricao,
          p.descricao_completa,
          p.fabricante,
          m.nome AS marca,
          c.nome AS categoria,
          COALESCE(
            NULLIF(p.preco_promocional, 0),
            p.preco
          )::text AS preco,
          p.preco::text AS preco_original,
          p.preco_promocional::text,
          p.estoque::text,
          p.unidade,
          p.permite_venda_sem_estoque,
          p.localizacao,
          COALESCE(
            ARRAY_AGG(
              DISTINCT CONCAT_WS(
                ' ',
                v.montadora,
                v.modelo,
                v.versao,
                v.motor,
                v.combustivel,
                CASE
                  WHEN v.ano_inicial IS NOT NULL
                    AND v.ano_final IS NOT NULL
                  THEN
                    v.ano_inicial::text
                    || '-'
                    || v.ano_final::text
                  WHEN v.ano_inicial IS NOT NULL
                  THEN v.ano_inicial::text
                  ELSE NULL
                END
              )
            ) FILTER (
              WHERE v.id IS NOT NULL
            ),
            ARRAY[]::text[]
          ) AS aplicacoes,
          LOWER(
            CONCAT_WS(
              ' ',
              p.codigo_interno,
              p.codigo_fabricante,
              p.codigo_oem,
              p.ean,
              p.descricao,
              p.descricao_completa,
              p.fabricante,
              m.nome,
              c.nome,
              STRING_AGG(
                DISTINCT CONCAT_WS(
                  ' ',
                  v.montadora,
                  v.modelo,
                  v.versao,
                  v.motor,
                  v.combustivel,
                  v.ano_inicial,
                  v.ano_final
                ),
                ' '
              )
            )
          ) AS texto_pesquisa
        FROM catalogo.produtos AS p
        LEFT JOIN catalogo.categorias AS c
          ON c.id = p.categoria_id
        LEFT JOIN catalogo.marcas AS m
          ON m.id = p.marca_id
        LEFT JOIN catalogo.produto_aplicacoes AS pa
          ON pa.produto_id = p.id
        LEFT JOIN catalogo.veiculos AS v
          ON v.id = pa.veiculo_id
          AND v.status = 'ativo'
        WHERE
          p.empresa_id = ${empresaId}
          AND p.status = 'ativo'
        GROUP BY
          p.id,
          p.empresa_id,
          p.codigo_interno,
          p.codigo_fabricante,
          p.codigo_oem,
          p.descricao,
          p.descricao_completa,
          p.fabricante,
          m.nome,
          c.nome,
          p.preco,
          p.preco_promocional,
          p.estoque,
          p.unidade,
          p.permite_venda_sem_estoque,
          p.localizacao
      ),
      produtos_pontuados AS (
        SELECT
          pp.*,
          (
            SELECT COUNT(*)
            FROM jsonb_array_elements_text(
              ${termosJson}::jsonb
            ) AS termo(valor)
            WHERE
              pp.texto_pesquisa
                ILIKE '%' || termo.valor || '%'
          ) AS pontuacao
        FROM produtos_pesquisa AS pp
      )
      SELECT
        id,
        empresa_id,
        codigo_interno,
        codigo_fabricante,
        codigo_oem,
        descricao,
        descricao_completa,
        fabricante,
        marca,
        categoria,
        preco,
        preco_original,
        preco_promocional,
        estoque,
        unidade,
        permite_venda_sem_estoque,
        localizacao,
        aplicacoes,
        pontuacao
      FROM produtos_pontuados
      WHERE
        pontuacao >= CASE
          WHEN jsonb_array_length(
            ${termosJson}::jsonb
          ) >= 4 THEN 2
          ELSE 1
        END
      ORDER BY
        pontuacao DESC,
        CASE
          WHEN estoque::numeric > 0 THEN 0
          WHEN permite_venda_sem_estoque THEN 1
          ELSE 2
        END,
        estoque::numeric DESC,
        descricao
      LIMIT ${limiteSeguro}
    `;

  return resultados.map(mapearProduto);
}

export async function buscarProdutoPorId(
  empresaId: bigint,
  produtoId: bigint,
): Promise<ProdutoEncontrado | null> {
  const prisma = getPrisma();

  const resultados =
    await prisma.$queryRaw<ProdutoBanco[]>`
      SELECT
        p.id,
        p.empresa_id,
        p.codigo_interno,
        p.codigo_fabricante,
        p.codigo_oem,
        p.descricao,
        p.descricao_completa,
        p.fabricante,
        m.nome AS marca,
        c.nome AS categoria,
        COALESCE(
          NULLIF(p.preco_promocional, 0),
          p.preco
        )::text AS preco,
        p.preco::text AS preco_original,
        p.preco_promocional::text,
        p.estoque::text,
        p.unidade,
        p.permite_venda_sem_estoque,
        p.localizacao,
        ARRAY[]::text[] AS aplicacoes,
        1::bigint AS pontuacao
      FROM catalogo.produtos AS p
      LEFT JOIN catalogo.categorias AS c
        ON c.id = p.categoria_id
      LEFT JOIN catalogo.marcas AS m
        ON m.id = p.marca_id
      WHERE
        p.id = ${produtoId}
        AND p.empresa_id = ${empresaId}
        AND p.status = 'ativo'
      LIMIT 1
    `;

  const produto = resultados[0];

  return produto
    ? mapearProduto(produto)
    : null;
}
