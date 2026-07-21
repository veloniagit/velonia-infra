import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ProdutoBanco = {
  id: bigint;
  empresa_id: bigint;
  empresa: string;
  categoria_id: bigint | null;
  categoria: string | null;
  marca_id: bigint | null;
  marca: string | null;
  codigo_interno: string;
  codigo_fabricante: string | null;
  ean: string | null;
  descricao: string;
  descricao_completa: string | null;
  fabricante: string | null;
  ncm: string | null;
  preco: string;
  preco_promocional: string | null;
  custo: string | null;
  estoque: string;
  estoque_minimo: string;
  unidade: string;
  peso_kg: string | null;
  localizacao: string | null;
  imagem_url: string | null;
  permite_venda_sem_estoque: boolean;
  status: string;
  criado_em: Date;
  atualizado_em: Date;
};

function numeroPositivo(
  valor: string | null,
  padrao: number,
  maximo: number,
): number {
  const convertido = Number(valor);

  if (!Number.isInteger(convertido) || convertido <= 0) {
    return padrao;
  }

  return Math.min(convertido, maximo);
}

export async function GET(request: Request) {
  try {
    const prisma = getPrisma();
    const url = new URL(request.url);

    const busca = url.searchParams.get("busca")?.trim() || null;
    const status = url.searchParams.get("status")?.trim() || null;
    const empresaInformada = url.searchParams.get("empresaId");

    const empresaId =
      empresaInformada && /^\d+$/.test(empresaInformada)
        ? BigInt(empresaInformada)
        : null;

    const limite = numeroPositivo(
      url.searchParams.get("limite"),
      50,
      200,
    );

    const pagina = numeroPositivo(
      url.searchParams.get("pagina"),
      1,
      100000,
    );

    const offset = (pagina - 1) * limite;

    const produtos = await prisma.$queryRaw<ProdutoBanco[]>`
      SELECT
        p.id,
        p.empresa_id,
        e.nome_fantasia AS empresa,
        p.categoria_id,
        c.nome AS categoria,
        p.marca_id,
        m.nome AS marca,
        p.codigo_interno,
        p.codigo_fabricante,
        p.ean,
        p.descricao,
        p.descricao_completa,
        p.fabricante,
        p.ncm,
        p.preco::text,
        p.preco_promocional::text,
        p.custo::text,
        p.estoque::text,
        p.estoque_minimo::text,
        p.unidade,
        p.peso_kg::text,
        p.localizacao,
        p.imagem_url,
        p.permite_venda_sem_estoque,
        p.status,
        p.criado_em,
        p.atualizado_em
      FROM catalogo.produtos AS p
      INNER JOIN crm.empresas AS e
        ON e.id = p.empresa_id
      LEFT JOIN catalogo.categorias AS c
        ON c.id = p.categoria_id
      LEFT JOIN catalogo.marcas AS m
        ON m.id = p.marca_id
      WHERE
        (${empresaId}::bigint IS NULL OR p.empresa_id = ${empresaId})
        AND (${status}::text IS NULL OR p.status = ${status})
        AND (
          ${busca}::text IS NULL
          OR p.codigo_interno ILIKE '%' || ${busca} || '%'
          OR p.codigo_fabricante ILIKE '%' || ${busca} || '%'
          OR p.ean ILIKE '%' || ${busca} || '%'
          OR p.descricao ILIKE '%' || ${busca} || '%'
          OR p.fabricante ILIKE '%' || ${busca} || '%'
          OR c.nome ILIKE '%' || ${busca} || '%'
          OR m.nome ILIKE '%' || ${busca} || '%'
        )
      ORDER BY p.criado_em DESC, p.id DESC
      LIMIT ${limite}
      OFFSET ${offset}
    `;

    const totalResultado = await prisma.$queryRaw<
      Array<{ total: bigint }>
    >`
      SELECT COUNT(*) AS total
      FROM catalogo.produtos AS p
      LEFT JOIN catalogo.categorias AS c
        ON c.id = p.categoria_id
      LEFT JOIN catalogo.marcas AS m
        ON m.id = p.marca_id
      WHERE
        (${empresaId}::bigint IS NULL OR p.empresa_id = ${empresaId})
        AND (${status}::text IS NULL OR p.status = ${status})
        AND (
          ${busca}::text IS NULL
          OR p.codigo_interno ILIKE '%' || ${busca} || '%'
          OR p.codigo_fabricante ILIKE '%' || ${busca} || '%'
          OR p.ean ILIKE '%' || ${busca} || '%'
          OR p.descricao ILIKE '%' || ${busca} || '%'
          OR p.fabricante ILIKE '%' || ${busca} || '%'
          OR c.nome ILIKE '%' || ${busca} || '%'
          OR m.nome ILIKE '%' || ${busca} || '%'
        )
    `;

    const total = Number(totalResultado[0]?.total ?? 0);

    return NextResponse.json({
      total,
      pagina,
      limite,
      totalPaginas: Math.ceil(total / limite),
      produtos: produtos.map((produto) => ({
        id: produto.id.toString(),
        empresaId: produto.empresa_id.toString(),
        empresa: produto.empresa,
        categoriaId: produto.categoria_id?.toString() ?? null,
        categoria: produto.categoria,
        marcaId: produto.marca_id?.toString() ?? null,
        marca: produto.marca,
        codigoInterno: produto.codigo_interno,
        codigoFabricante: produto.codigo_fabricante,
        ean: produto.ean,
        descricao: produto.descricao,
        descricaoCompleta: produto.descricao_completa,
        fabricante: produto.fabricante,
        ncm: produto.ncm,
        preco: Number(produto.preco),
        precoPromocional:
          produto.preco_promocional === null
            ? null
            : Number(produto.preco_promocional),
        custo:
          produto.custo === null
            ? null
            : Number(produto.custo),
        estoque: Number(produto.estoque),
        estoqueMinimo: Number(produto.estoque_minimo),
        unidade: produto.unidade,
        pesoKg:
          produto.peso_kg === null
            ? null
            : Number(produto.peso_kg),
        localizacao: produto.localizacao,
        imagemUrl: produto.imagem_url,
        permiteVendaSemEstoque: produto.permite_venda_sem_estoque,
        status: produto.status,
        criadoEm: produto.criado_em,
        atualizadoEm: produto.atualizado_em,
      })),
    });
  } catch (error) {
    console.error("Erro ao listar produtos:", error);

    return NextResponse.json(
      {
        status: "erro",
        mensagem: "Não foi possível listar os produtos.",
      },
      { status: 500 },
    );
  }
}
