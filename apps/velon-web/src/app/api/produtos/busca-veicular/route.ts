import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ProdutoVeicularBanco = {
  produto_id: bigint;
  empresa_id: bigint;
  empresa: string;
  codigo_interno: string;
  codigo_fabricante: string | null;
  descricao: string;
  categoria: string | null;
  marca: string | null;
  fabricante: string | null;
  preco: string;
  preco_promocional: string | null;
  estoque: string;
  unidade: string;
  localizacao: string | null;
  status: string;
  veiculo_id: bigint;
  montadora: string;
  modelo: string;
  versao: string | null;
  motor: string | null;
  combustivel: string | null;
  ano_inicial: number | null;
  ano_final: number | null;
};

function parseId(valor: string | null): bigint | null {
  if (!valor || !/^\d+$/.test(valor)) {
    return null;
  }

  return BigInt(valor);
}

function parseAno(valor: string | null): number | null {
  if (!valor || !/^\d{4}$/.test(valor)) {
    return null;
  }

  const ano = Number(valor);

  if (ano < 1900 || ano > 2100) {
    return null;
  }

  return ano;
}

export async function GET(request: Request) {
  try {
    const prisma = getPrisma();
    const url = new URL(request.url);

    const empresaId = parseId(url.searchParams.get("empresaId"));
    const montadora = url.searchParams.get("montadora")?.trim() || null;
    const modelo = url.searchParams.get("modelo")?.trim() || null;
    const motor = url.searchParams.get("motor")?.trim() || null;
    const combustivel =
      url.searchParams.get("combustivel")?.trim() || null;
    const produto = url.searchParams.get("produto")?.trim() || null;
    const ano = parseAno(url.searchParams.get("ano"));

    const filtrosInformados =
      empresaId !== null ||
      montadora !== null ||
      modelo !== null ||
      motor !== null ||
      combustivel !== null ||
      produto !== null ||
      ano !== null;

    if (!filtrosInformados) {
      return NextResponse.json(
        {
          status: "erro",
          mensagem:
            "Informe ao menos um filtro: empresaId, produto, montadora, modelo, motor, combustivel ou ano.",
        },
        { status: 400 },
      );
    }

    const resultados = await prisma.$queryRaw<ProdutoVeicularBanco[]>`
      SELECT
        p.id AS produto_id,
        p.empresa_id,
        e.nome_fantasia AS empresa,
        p.codigo_interno,
        p.codigo_fabricante,
        p.descricao,
        c.nome AS categoria,
        m.nome AS marca,
        p.fabricante,
        p.preco::text,
        p.preco_promocional::text,
        p.estoque::text,
        p.unidade,
        p.localizacao,
        p.status,
        v.id AS veiculo_id,
        v.montadora,
        v.modelo,
        v.versao,
        v.motor,
        v.combustivel,
        v.ano_inicial,
        v.ano_final
      FROM catalogo.produto_aplicacoes AS pa
      INNER JOIN catalogo.produtos AS p
        ON p.id = pa.produto_id
      INNER JOIN catalogo.veiculos AS v
        ON v.id = pa.veiculo_id
      INNER JOIN crm.empresas AS e
        ON e.id = p.empresa_id
      LEFT JOIN catalogo.categorias AS c
        ON c.id = p.categoria_id
      LEFT JOIN catalogo.marcas AS m
        ON m.id = p.marca_id
      WHERE
        p.status = 'ativo'
        AND (
          ${empresaId}::bigint IS NULL
          OR p.empresa_id = ${empresaId}
        )
        AND (
          ${produto}::text IS NULL
          OR p.descricao ILIKE '%' || ${produto} || '%'
          OR p.codigo_interno ILIKE '%' || ${produto} || '%'
          OR p.codigo_fabricante ILIKE '%' || ${produto} || '%'
          OR c.nome ILIKE '%' || ${produto} || '%'
          OR m.nome ILIKE '%' || ${produto} || '%'
        )
        AND (
          ${montadora}::text IS NULL
          OR v.montadora ILIKE '%' || ${montadora} || '%'
        )
        AND (
          ${modelo}::text IS NULL
          OR v.modelo ILIKE '%' || ${modelo} || '%'
        )
        AND (
          ${motor}::text IS NULL
          OR v.motor ILIKE '%' || ${motor} || '%'
        )
        AND (
          ${combustivel}::text IS NULL
          OR v.combustivel ILIKE '%' || ${combustivel} || '%'
        )
        AND (
          ${ano}::integer IS NULL
          OR (
            (v.ano_inicial IS NULL OR v.ano_inicial <= ${ano})
            AND
            (v.ano_final IS NULL OR v.ano_final >= ${ano})
          )
        )
      ORDER BY
        CASE WHEN p.estoque > 0 THEN 0 ELSE 1 END,
        p.descricao,
        v.montadora,
        v.modelo
      LIMIT 100
    `;

    return NextResponse.json({
      total: resultados.length,
      filtros: {
        empresaId: empresaId?.toString() ?? null,
        produto,
        montadora,
        modelo,
        motor,
        combustivel,
        ano,
      },
      resultados: resultados.map((item) => ({
        produtoId: item.produto_id.toString(),
        empresaId: item.empresa_id.toString(),
        empresa: item.empresa,
        codigoInterno: item.codigo_interno,
        codigoFabricante: item.codigo_fabricante,
        descricao: item.descricao,
        categoria: item.categoria,
        marca: item.marca,
        fabricante: item.fabricante,
        preco: Number(item.preco),
        precoPromocional:
          item.preco_promocional === null
            ? null
            : Number(item.preco_promocional),
        estoque: Number(item.estoque),
        unidade: item.unidade,
        localizacao: item.localizacao,
        status: item.status,
        aplicacao: {
          veiculoId: item.veiculo_id.toString(),
          montadora: item.montadora,
          modelo: item.modelo,
          versao: item.versao,
          motor: item.motor,
          combustivel: item.combustivel,
          anoInicial: item.ano_inicial,
          anoFinal: item.ano_final,
        },
      })),
    });
  } catch (error) {
    console.error("Erro na busca veicular:", error);

    return NextResponse.json(
      {
        status: "erro",
        mensagem: "Não foi possível realizar a busca veicular.",
      },
      { status: 500 },
    );
  }
}
