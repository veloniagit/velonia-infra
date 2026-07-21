import type {
  EstadoConversa,
} from "@/lib/conversation/estado";

import type {
  IntencaoConversa,
  ResultadoIntencao,
} from "@/lib/conversation/intencao";

import {
  executarBuscaProduto,
} from "@/lib/conversation/acoes/buscarProduto";

import {
  executarSalvarQuantidade,
} from "@/lib/conversation/acoes/salvarQuantidade";

import {
  executarCriarOrcamento,
} from "@/lib/conversation/acoes/criarOrcamento";

import {
  executarSalvarNome,
} from "@/lib/conversation/acoes/salvarNome";

import {
  executarSalvarDocumento,
} from "@/lib/conversation/acoes/salvarDocumento";

import {
  executarSalvarCep,
} from "@/lib/conversation/acoes/salvarCep";

import {
  executarSalvarNumero,
} from "@/lib/conversation/acoes/salvarNumero";

import {
  executarGerarPix,
} from "@/lib/conversation/acoes/gerarPix";

export type ResultadoAcao = {
  sucesso: boolean;
  executada: boolean;
  intencao: IntencaoConversa;
  resposta: string;
  proximaEtapa: string | null;
  dados: Record<string, unknown>;
};

type ExecutarAcaoInput = {
  estado: EstadoConversa;
  mensagem: string;
  resultadoIntencao: ResultadoIntencao;
};

function respostaNaoImplementada(
  intencao: IntencaoConversa,
): ResultadoAcao {
  return {
    sucesso: true,
    executada: false,
    intencao,
    resposta:
      "Entendi sua solicitação, mas essa ação ainda está sendo integrada ao novo motor de atendimento.",
    proximaEtapa: null,
    dados: {
      motivo: "acao_nao_implementada",
    },
  };
}

export async function executarAcao({
  estado,
  mensagem,
  resultadoIntencao,
}: ExecutarAcaoInput): Promise<ResultadoAcao> {
  const { intencao } = resultadoIntencao;

  switch (intencao) {
    case "escolher_pagamento": {
      const formaPagamento = String(
        resultadoIntencao.dados.formaPagamento ?? "",
      );

      if (formaPagamento !== "pix") {
        return {
          sucesso: true,
          executada: false,
          intencao,
          resposta:
            "Neste momento, o novo motor está habilitado para PIX. Escolha PIX para continuar.",
          proximaEtapa:
            "aguardando_pagamento",
          dados: {
            formaPagamento,
            disponivel: false,
          },
        };
      }

      const resultado =
        await executarGerarPix(
          estado,
          mensagem,
        );

      return {
        sucesso: resultado.sucesso,
        executada: true,
        intencao,
        resposta: resultado.resposta,
        proximaEtapa:
          "pagamento_pendente",
        dados: {
          pagamentoId:
            resultado.pagamentoId.toString(),
          propostaId:
            resultado.propostaId.toString(),
          txid: resultado.txid,
          codigoPix:
            resultado.codigoPix,
          valor: resultado.valor,
          status: resultado.status,
          gateway: "simulado",
        },
      };
    }

    case "informar_numero": {
      const resultado =
        await executarSalvarNumero(
          estado,
          resultadoIntencao.dados.numeroEndereco,
          mensagem,
        );

      return {
        sucesso: resultado.sucesso,
        executada: true,
        intencao,
        resposta: resultado.resposta,
        proximaEtapa:
          "aguardando_pagamento",
        dados: {
          numero: resultado.numero,
          complemento:
            resultado.complemento,
        },
      };
    }

    case "informar_cep": {
      const resultado =
        await executarSalvarCep(
          estado,
          resultadoIntencao.dados.cep,
          mensagem,
        );

      return {
        sucesso: resultado.sucesso,
        executada: true,
        intencao,
        resposta: resultado.resposta,
        proximaEtapa:
          resultado.proximaEtapa,
        dados: {
          cep: resultado.cep,
          logradouro:
            resultado.logradouro,
          bairro: resultado.bairro,
          cidade: resultado.cidade,
          estado: resultado.estado,
        },
      };
    }

    case "informar_documento": {
      const resultado =
        await executarSalvarDocumento(
          estado,
          resultadoIntencao.dados.documento,
          mensagem,
        );

      return {
        sucesso: resultado.sucesso,
        executada: true,
        intencao,
        resposta: resultado.resposta,
        proximaEtapa: "aguardando_cep",
        dados: {
          documento: resultado.documento,
          tipoDocumento:
            resultado.tipoDocumento,
        },
      };
    }

    case "informar_nome": {
      const resultado =
        await executarSalvarNome(
          estado,
          resultadoIntencao.dados.nome,
          mensagem,
        );

      return {
        sucesso: resultado.sucesso,
        executada: true,
        intencao,
        resposta: resultado.resposta,
        proximaEtapa:
          "aguardando_documento",
        dados: {
          clienteId:
            resultado.clienteId.toString(),
          nome: resultado.nome,
        },
      };
    }

    case "informar_quantidade": {
      const resultado =
        await executarSalvarQuantidade(
          estado,
          resultadoIntencao.dados.quantidade,
          mensagem,
        );

      return {
        sucesso: resultado.sucesso,
        executada: true,
        intencao,
        resposta: resultado.resposta,
        proximaEtapa: resultado.sucesso
          ? "oferecendo_orcamento"
          : "aguardando_quantidade",
        dados: {
          quantidade: resultado.quantidade,
          valorUnitario:
            resultado.valorUnitario,
          valorTotal: resultado.valorTotal,
          estoqueDisponivel:
            resultado.estoqueDisponivel,
        },
      };
    }

    case "confirmar": {
      if (
        estado.etapa ===
        "oferecendo_orcamento"
      ) {
        const resultado =
          await executarCriarOrcamento(
            estado,
            mensagem,
          );

        return {
          sucesso: resultado.sucesso,
          executada: true,
          intencao,
          resposta: resultado.resposta,
          proximaEtapa:
            "aguardando_nome",
          dados: {
            propostaId:
              resultado.propostaId.toString(),
            numero: resultado.numero,
            quantidade:
              resultado.quantidade,
            valorUnitario:
              resultado.valorUnitario,
            valorTotal:
              resultado.valorTotal,
          },
        };
      }

      return respostaNaoImplementada(
        intencao,
      );
    }

    case "buscar_produto": {
      const resultado =
        await executarBuscaProduto(
          estado,
          mensagem,
        );

      return {
        sucesso: resultado.sucesso,
        executada: true,
        intencao,
        resposta: resultado.resposta,
        proximaEtapa:
          resultado.encontrado
            ? "aguardando_quantidade"
            : "buscando_produto",
        dados: {
          encontrado:
            resultado.encontrado,

          produtoPrincipal:
            resultado.produtoPrincipal
              ? {
                  id:
                    resultado.produtoPrincipal.id.toString(),
                  codigoInterno:
                    resultado.produtoPrincipal
                      .codigoInterno,
                  descricao:
                    resultado.produtoPrincipal
                      .descricao,
                  preco:
                    resultado.produtoPrincipal.preco,
                  estoque:
                    resultado.produtoPrincipal.estoque,
                  unidade:
                    resultado.produtoPrincipal.unidade,
                }
              : null,

          alternativas:
            resultado.alternativas.map(
              (produto) => ({
                id: produto.id.toString(),
                codigoInterno:
                  produto.codigoInterno,
                descricao:
                  produto.descricao,
                preco: produto.preco,
                estoque: produto.estoque,
              }),
            ),
        },
      };
    }

    case "saudacao":
      return {
        sucesso: true,
        executada: true,
        intencao,
        resposta:
          "Olá! Sou o consultor virtual da VelON IA. Qual produto ou peça você está procurando?",
        proximaEtapa: "inicio",
        dados: {},
      };

    case "atendimento_humano":
      return {
        sucesso: true,
        executada: true,
        intencao,
        resposta:
          "Certo. Vou encaminhar seu atendimento para um consultor humano.",
        proximaEtapa: null,
        dados: {
          transferirParaHumano: true,
        },
      };

    case "mensagem_generica":
      return {
        sucesso: true,
        executada: true,
        intencao,
        resposta:
          "Para localizar o produto correto, informe o nome da peça, marca, modelo, ano e motorização do veículo.",
        proximaEtapa: estado.etapa,
        dados: {},
      };

    default:
      return respostaNaoImplementada(
        intencao,
      );
  }
}
