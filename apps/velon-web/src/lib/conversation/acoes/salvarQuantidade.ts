import {
  atualizarEstadoConversa,
  type EstadoConversa,
} from "@/lib/conversation/estado";

import {
  buscarProdutoPorId,
} from "@/lib/conversation/services/produto.service";

export type ResultadoSalvarQuantidade = {
  sucesso: boolean;
  resposta: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  estoqueDisponivel: number;
};

function moeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

export async function executarSalvarQuantidade(
  estado: EstadoConversa,
  quantidadeInformada: unknown,
  mensagem: string,
): Promise<ResultadoSalvarQuantidade> {
  if (!estado.ultimoProdutoId) {
    throw new Error(
      "A conversa não possui um produto selecionado.",
    );
  }

  const quantidade = Number(quantidadeInformada);

  if (
    !Number.isFinite(quantidade) ||
    quantidade <= 0 ||
    quantidade > 9999
  ) {
    throw new Error(
      "Informe uma quantidade válida.",
    );
  }

  const produto = await buscarProdutoPorId(
    estado.empresaId,
    estado.ultimoProdutoId,
  );

  if (!produto) {
    throw new Error(
      "O produto selecionado não está mais disponível.",
    );
  }

  if (
    !produto.permiteVendaSemEstoque &&
    produto.estoque < quantidade
  ) {
    const resposta =
      `Temos apenas ${produto.estoque} ` +
      `${produto.unidade}(s) disponíveis. ` +
      "Informe uma quantidade menor.";

    await atualizarEstadoConversa(
      estado.id,
      {
        etapa: "aguardando_quantidade",
        ultimaMensagemCliente: mensagem,
        ultimaRespostaIa: resposta,
        contexto: {
          quantidadeSolicitada: quantidade,
          estoqueInsuficiente: true,
          estoqueDisponivel: produto.estoque,
        },
      },
    );

    return {
      sucesso: false,
      resposta,
      quantidade,
      valorUnitario: produto.preco,
      valorTotal: 0,
      estoqueDisponivel: produto.estoque,
    };
  }

  const valorTotal =
    Math.round(
      quantidade * produto.preco * 100,
    ) / 100;

  const resposta =
    `Perfeito. ${quantidade} ` +
    `${produto.unidade}(s) de ${produto.descricao}. ` +
    `Valor unitário: ${moeda(produto.preco)}. ` +
    `Total: ${moeda(valorTotal)}. ` +
    "Deseja confirmar e gerar o orçamento?";

  await atualizarEstadoConversa(
    estado.id,
    {
      etapa: "oferecendo_orcamento",
      quantidade,
      ultimaMensagemCliente: mensagem,
      ultimaRespostaIa: resposta,
      contexto: {
        quantidadeSelecionada: quantidade,
        valorUnitario: produto.preco,
        valorTotal,
        estoqueDisponivel: produto.estoque,
      },
    },
  );

  return {
    sucesso: true,
    resposta,
    quantidade,
    valorUnitario: produto.preco,
    valorTotal,
    estoqueDisponivel: produto.estoque,
  };
}
