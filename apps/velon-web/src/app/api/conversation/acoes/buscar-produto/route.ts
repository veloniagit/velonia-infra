import { NextResponse } from "next/server";

import {
  obterOuCriarEstadoConversa,
} from "@/lib/conversation/estado";

import {
  executarBuscaProduto,
} from "@/lib/conversation/acoes/buscarProduto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(
  request: Request,
) {
  try {
    const corpo = await request.json();

    const empresaIdTexto =
      String(corpo.empresaId ?? "");

    const contato =
      String(corpo.contato ?? "")
        .replace(/\D/g, "");

    const mensagem =
      String(corpo.mensagem ?? "").trim();

    if (
      !/^\d+$/.test(empresaIdTexto) ||
      !contato ||
      !mensagem
    ) {
      return NextResponse.json(
        {
          status: "erro",
          mensagem:
            "Informe empresaId, contato e mensagem.",
        },
        { status: 400 },
      );
    }

    const estado =
      await obterOuCriarEstadoConversa(
        BigInt(empresaIdTexto),
        contato,
      );

    const resultado =
      await executarBuscaProduto(
        estado,
        mensagem,
      );

    return NextResponse.json({
      status: "ok",
      resultado: {
        sucesso: resultado.sucesso,
        encontrado: resultado.encontrado,
        resposta: resultado.resposta,
        produtoPrincipal:
          resultado.produtoPrincipal
            ? {
                id:
                  resultado.produtoPrincipal.id.toString(),
                codigoInterno:
                  resultado.produtoPrincipal.codigoInterno,
                descricao:
                  resultado.produtoPrincipal.descricao,
                preco:
                  resultado.produtoPrincipal.preco,
                precoOriginal:
                  resultado.produtoPrincipal.precoOriginal,
                precoPromocional:
                  resultado.produtoPrincipal.precoPromocional,
                estoque:
                  resultado.produtoPrincipal.estoque,
                unidade:
                  resultado.produtoPrincipal.unidade,
                permiteVendaSemEstoque:
                  resultado.produtoPrincipal
                    .permiteVendaSemEstoque,
                aplicacoes:
                  resultado.produtoPrincipal.aplicacoes,
                pontuacao:
                  resultado.produtoPrincipal.pontuacao,
              }
            : null,
        alternativas:
          resultado.alternativas.map(
            (produto) => ({
              id: produto.id.toString(),
              codigoInterno:
                produto.codigoInterno,
              descricao: produto.descricao,
              preco: produto.preco,
              estoque: produto.estoque,
              pontuacao: produto.pontuacao,
            }),
          ),
      },
    });
  } catch (error) {
    console.error(
      "Erro na ação buscar produto:",
      error,
    );

    return NextResponse.json(
      {
        status: "erro",
        mensagem:
          "Não foi possível buscar o produto.",
        detalhe:
          error instanceof Error
            ? error.message
            : "Erro desconhecido.",
      },
      { status: 500 },
    );
  }
}
