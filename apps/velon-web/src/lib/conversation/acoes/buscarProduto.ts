import {
  atualizarEstadoConversa,
  type EstadoConversa,
} from "@/lib/conversation/estado";

import {
  buscarProdutos,
  type ProdutoEncontrado,
} from "@/lib/conversation/services/produto.service";

export type ResultadoBuscaProduto = {
  sucesso: boolean;
  encontrado: boolean;
  resposta: string;
  produtoPrincipal: ProdutoEncontrado | null;
  alternativas: ProdutoEncontrado[];
};

function moeda(valor: number): string {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    },
  ).format(valor);
}

function montarRespostaProduto(
  produto: ProdutoEncontrado,
  alternativas: ProdutoEncontrado[],
): string {
  const disponibilidade =
    produto.estoque > 0
      ? `Temos ${produto.estoque} ${produto.unidade}(s) em estoque.`
      : produto.permiteVendaSemEstoque
        ? "Produto disponível sob encomenda."
        : "Produto sem estoque no momento.";

  const promocao =
    produto.precoPromocional !== null &&
    produto.precoPromocional <
      produto.precoOriginal
      ? ` De ${moeda(
          produto.precoOriginal,
        )} por ${moeda(produto.preco)}.`
      : ` Valor: ${moeda(produto.preco)}.`;

  const complemento =
    alternativas.length > 0
      ? ` Também encontrei ${alternativas.length} alternativa(s) compatível(is).`
      : "";

  return (
    `Encontrei ${produto.descricao}.` +
    promocao +
    ` ${disponibilidade}` +
    complemento +
    " Quantas unidades você precisa?"
  );
}

export async function executarBuscaProduto(
  estado: EstadoConversa,
  mensagem: string,
): Promise<ResultadoBuscaProduto> {
  const produtos = await buscarProdutos(
    estado.empresaId,
    mensagem,
    5,
  );

  if (produtos.length === 0) {
    await atualizarEstadoConversa(
      estado.id,
      {
        etapa: "buscando_produto",
        ultimaMensagemCliente: mensagem,
        ultimaRespostaIa:
          "Não encontrei o produto solicitado.",
        contexto: {
          ultimaBuscaProduto: mensagem,
          produtosEncontrados: [],
        },
      },
    );

    return {
      sucesso: true,
      encontrado: false,
      resposta:
        "Não encontrei esse produto com as informações enviadas. Informe o nome da peça, marca, modelo, ano e motorização do veículo.",
      produtoPrincipal: null,
      alternativas: [],
    };
  }

  const produtoPrincipal =
    produtos.find(
      (produto) =>
        produto.estoque > 0 ||
        produto.permiteVendaSemEstoque,
    ) ?? produtos[0];

  const alternativas = produtos
    .filter(
      (produto) =>
        produto.id !== produtoPrincipal.id,
    )
    .slice(0, 4);

  const resposta = montarRespostaProduto(
    produtoPrincipal,
    alternativas,
  );

  const disponivelParaVenda =
    produtoPrincipal.estoque > 0 ||
    produtoPrincipal.permiteVendaSemEstoque;

  await atualizarEstadoConversa(
    estado.id,
    {
      etapa: disponivelParaVenda
        ? "aguardando_quantidade"
        : "produto_encontrado",
      ultimoProdutoId:
        produtoPrincipal.id,
      quantidade: 1,
      ultimaMensagemCliente: mensagem,
      ultimaRespostaIa: resposta,
      contexto: {
        ultimaBuscaProduto: mensagem,
        produtoPrincipal: {
          id: produtoPrincipal.id.toString(),
          codigoInterno:
            produtoPrincipal.codigoInterno,
          descricao:
            produtoPrincipal.descricao,
          preco: produtoPrincipal.preco,
          estoque: produtoPrincipal.estoque,
          permiteVendaSemEstoque:
            produtoPrincipal.permiteVendaSemEstoque,
        },
        alternativas: alternativas.map(
          (produto) => ({
            id: produto.id.toString(),
            codigoInterno:
              produto.codigoInterno,
            descricao: produto.descricao,
            preco: produto.preco,
            estoque: produto.estoque,
          }),
        ),
      },
    },
  );

  return {
    sucesso: true,
    encontrado: true,
    resposta,
    produtoPrincipal,
    alternativas,
  };
}
