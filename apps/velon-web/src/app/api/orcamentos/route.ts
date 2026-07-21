import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ItemEntrada = {
  produtoId: string;
  quantidade: number;
  desconto?: number;
  observacoes?: string;
};

type OrcamentoEntrada = {
  oportunidadeId?: string | null;
  vendedorId?: string | null;
  titulo: string;
  descricao?: string;
  validade?: string | null;
  desconto?: number;
  itens: ItemEntrada[];
};

type ProdutoBanco = {
  id: bigint;
  codigo_interno: string;
  descricao: string;
  valor_unitario: string;
  estoque: string;
};

function idOpcional(valor: string | null | undefined): bigint | null {
  if (!valor || !/^\d+$/.test(valor)) {
    return null;
  }

  return BigInt(valor);
}

function dinheiro(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OrcamentoEntrada;

    if (!body.titulo?.trim()) {
      return NextResponse.json(
        {
          status: "erro",
          mensagem: "O título do orçamento é obrigatório.",
        },
        { status: 400 },
      );
    }

    if (!Array.isArray(body.itens) || body.itens.length === 0) {
      return NextResponse.json(
        {
          status: "erro",
          mensagem: "O orçamento precisa ter ao menos um item.",
        },
        { status: 400 },
      );
    }

    const oportunidadeId = idOpcional(body.oportunidadeId);
    const vendedorId = idOpcional(body.vendedorId);
    const descontoOrcamento = dinheiro(Number(body.desconto ?? 0));

    if (descontoOrcamento < 0) {
      return NextResponse.json(
        {
          status: "erro",
          mensagem: "O desconto do orçamento não pode ser negativo.",
        },
        { status: 400 },
      );
    }

    const prisma = getPrisma();

    const resultado = await prisma.$transaction(async (tx) => {
      const propostaCriada = await tx.$queryRaw<Array<{ id: bigint }>>`
        INSERT INTO comercial.propostas (
          oportunidade_id,
          vendedor_id,
          titulo,
          descricao,
          desconto,
          valor_total,
          validade,
          status
        )
        VALUES (
          ${oportunidadeId},
          ${vendedorId},
          ${body.titulo.trim()},
          ${body.descricao?.trim() || null},
          ${descontoOrcamento},
          0,
          ${body.validade ? new Date(`${body.validade}T00:00:00`) : null},
          'rascunho'
        )
        RETURNING id
      `;

      const propostaId = propostaCriada[0].id;
      const numero = `ORC-${propostaId.toString().padStart(6, "0")}`;

      await tx.$executeRaw`
        UPDATE comercial.propostas
        SET
          numero = ${numero},
          atualizado_em = NOW()
        WHERE id = ${propostaId}
      `;

      let subtotal = 0;
      const itensCriados = [];

      for (const item of body.itens) {
        if (!/^\d+$/.test(item.produtoId)) {
          throw new Error(`Produto inválido: ${item.produtoId}`);
        }

        const quantidade = Number(item.quantidade);
        const descontoItem = dinheiro(Number(item.desconto ?? 0));

        if (!Number.isFinite(quantidade) || quantidade <= 0) {
          throw new Error("A quantidade de cada item deve ser maior que zero.");
        }

        if (descontoItem < 0) {
          throw new Error("O desconto do item não pode ser negativo.");
        }

        const produtoId = BigInt(item.produtoId);

        const produtos = await tx.$queryRaw<ProdutoBanco[]>`
          SELECT
            id,
            codigo_interno,
            descricao,
            COALESCE(preco_promocional, preco)::text AS valor_unitario,
            estoque::text
          FROM catalogo.produtos
          WHERE id = ${produtoId}
            AND status = 'ativo'
          LIMIT 1
        `;

        const produto = produtos[0];

        if (!produto) {
          throw new Error(`Produto ${item.produtoId} não encontrado ou inativo.`);
        }

        const valorUnitario = dinheiro(Number(produto.valor_unitario));
        const valorBruto = dinheiro(quantidade * valorUnitario);
        const valorTotal = dinheiro(Math.max(0, valorBruto - descontoItem));

        await tx.$executeRaw`
          INSERT INTO comercial.proposta_itens (
            proposta_id,
            produto_id,
            codigo_produto,
            descricao,
            quantidade,
            valor_unitario,
            desconto,
            valor_total,
            observacoes
          )
          VALUES (
            ${propostaId},
            ${produto.id},
            ${produto.codigo_interno},
            ${produto.descricao},
            ${quantidade},
            ${valorUnitario},
            ${descontoItem},
            ${valorTotal},
            ${item.observacoes?.trim() || null}
          )
        `;

        subtotal = dinheiro(subtotal + valorTotal);

        itensCriados.push({
          produtoId: produto.id.toString(),
          codigoProduto: produto.codigo_interno,
          descricao: produto.descricao,
          quantidade,
          valorUnitario,
          desconto: descontoItem,
          valorTotal,
          estoqueAtual: Number(produto.estoque),
        });
      }

      const total = dinheiro(Math.max(0, subtotal - descontoOrcamento));

      await tx.$executeRaw`
        UPDATE comercial.propostas
        SET
          valor_total = ${total},
          atualizado_em = NOW()
        WHERE id = ${propostaId}
      `;

      return {
        id: propostaId.toString(),
        numero,
        titulo: body.titulo.trim(),
        status: "rascunho",
        subtotal,
        desconto: descontoOrcamento,
        total,
        validade: body.validade ?? null,
        itens: itensCriados,
      };
    });

    return NextResponse.json(
      {
        status: "ok",
        mensagem: "Orçamento criado com sucesso.",
        orcamento: resultado,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Erro ao criar orçamento:", error);

    return NextResponse.json(
      {
        status: "erro",
        mensagem:
          error instanceof Error
            ? error.message
            : "Não foi possível criar o orçamento.",
      },
      { status: 500 },
    );
  }
}

type OrcamentoListaBanco = {
  id: bigint;
  numero: string | null;
  oportunidade_id: bigint | null;
  vendedor_id: bigint | null;
  titulo: string | null;
  descricao: string | null;
  desconto: string;
  valor_total: string;
  validade: Date | null;
  status: string;
  criado_em: Date;
  atualizado_em: Date;
  quantidade_itens: bigint;
};

function numeroInteiroPositivo(
  valor: string | null,
  padrao: number,
  maximo: number,
): number {
  const numero = Number(valor);

  if (!Number.isInteger(numero) || numero <= 0) {
    return padrao;
  }

  return Math.min(numero, maximo);
}

export async function GET(request: Request) {
  try {
    const prisma = getPrisma();
    const url = new URL(request.url);

    const busca = url.searchParams.get("busca")?.trim() || null;
    const status = url.searchParams.get("status")?.trim() || null;

    const pagina = numeroInteiroPositivo(
      url.searchParams.get("pagina"),
      1,
      100000,
    );

    const limite = numeroInteiroPositivo(
      url.searchParams.get("limite"),
      20,
      100,
    );

    const offset = (pagina - 1) * limite;

    const orcamentos = await prisma.$queryRaw<OrcamentoListaBanco[]>`
      SELECT
        p.id,
        p.numero,
        p.oportunidade_id,
        p.vendedor_id,
        p.titulo,
        p.descricao,
        p.desconto::text,
        p.valor_total::text,
        p.validade,
        p.status,
        p.criado_em,
        p.atualizado_em,
        COUNT(pi.id) AS quantidade_itens
      FROM comercial.propostas AS p
      LEFT JOIN comercial.proposta_itens AS pi
        ON pi.proposta_id = p.id
      WHERE
        (${status}::text IS NULL OR p.status = ${status})
        AND (
          ${busca}::text IS NULL
          OR p.numero ILIKE '%' || ${busca} || '%'
          OR p.titulo ILIKE '%' || ${busca} || '%'
          OR p.descricao ILIKE '%' || ${busca} || '%'
        )
      GROUP BY p.id
      ORDER BY p.criado_em DESC, p.id DESC
      LIMIT ${limite}
      OFFSET ${offset}
    `;

    const totalResultado = await prisma.$queryRaw<
      Array<{ total: bigint }>
    >`
      SELECT COUNT(*) AS total
      FROM comercial.propostas AS p
      WHERE
        (${status}::text IS NULL OR p.status = ${status})
        AND (
          ${busca}::text IS NULL
          OR p.numero ILIKE '%' || ${busca} || '%'
          OR p.titulo ILIKE '%' || ${busca} || '%'
          OR p.descricao ILIKE '%' || ${busca} || '%'
        )
    `;

    const total = Number(totalResultado[0]?.total ?? 0);

    return NextResponse.json({
      total,
      pagina,
      limite,
      totalPaginas: Math.ceil(total / limite),
      orcamentos: orcamentos.map((orcamento) => ({
        id: orcamento.id.toString(),
        numero: orcamento.numero,
        oportunidadeId:
          orcamento.oportunidade_id?.toString() ?? null,
        vendedorId:
          orcamento.vendedor_id?.toString() ?? null,
        titulo: orcamento.titulo,
        descricao: orcamento.descricao,
        quantidadeItens: Number(orcamento.quantidade_itens),
        desconto: Number(orcamento.desconto),
        valorTotal: Number(orcamento.valor_total),
        validade: orcamento.validade,
        status: orcamento.status,
        criadoEm: orcamento.criado_em,
        atualizadoEm: orcamento.atualizado_em,
      })),
    });
  } catch (error) {
    console.error("Erro ao listar orçamentos:", error);

    return NextResponse.json(
      {
        status: "erro",
        mensagem: "Não foi possível listar os orçamentos.",
      },
      { status: 500 },
    );
  }
}
