import {
  atualizarEstadoConversa,
  obterOuCriarEstadoConversa,
} from "@/lib/conversation/estado";

import {
  identificarIntencao,
} from "@/lib/conversation/intencao";

import {
  executarAcao,
} from "@/lib/conversation/acoes/index";

export type ProcessarMensagemInput = {
  empresaId: bigint;
  contato: string;
  mensagem: string;
};

export type ResultadoProcessamento = {
  sucesso: boolean;
  conversaId: bigint;
  intencao: string;
  confianca: number;
  acaoExecutada: boolean;
  resposta: string;
  etapaAnterior: string;
  proximaEtapa: string | null;
  dados: Record<string, unknown>;
};

export async function processarMensagem({
  empresaId,
  contato,
  mensagem,
}: ProcessarMensagemInput): Promise<ResultadoProcessamento> {
  const contatoNormalizado =
    contato.replace(/\D/g, "");

  const mensagemNormalizada =
    mensagem.trim();

  if (!contatoNormalizado) {
    throw new Error(
      "Contato inválido.",
    );
  }

  if (!mensagemNormalizada) {
    throw new Error(
      "Mensagem vazia.",
    );
  }

  const estado =
    await obterOuCriarEstadoConversa(
      empresaId,
      contatoNormalizado,
    );

  const etapaAnterior =
    estado.etapa;

  const resultadoIntencao =
    identificarIntencao(
      mensagemNormalizada,
      estado,
    );

  const resultadoAcao =
    await executarAcao({
      estado,
      mensagem: mensagemNormalizada,
      resultadoIntencao,
    });

  /*
   * A ação buscar produto já atualiza o estado
   * internamente. Para respostas simples, salvamos
   * aqui a mensagem e a resposta.
   */
  if (
    resultadoIntencao.intencao !==
    "buscar_produto"
  ) {
    await atualizarEstadoConversa(
      estado.id,
      {
        ultimaMensagemCliente:
          mensagemNormalizada,

        ultimaRespostaIa:
          resultadoAcao.resposta,

        contexto: {
          ultimaIntencao:
            resultadoIntencao.intencao,

          confiancaIntencao:
            resultadoIntencao.confianca,

          ultimaAcaoExecutada:
            resultadoAcao.executada,

          atualizadoPeloMotor:
            new Date().toISOString(),
        },
      },
    );
  }

  return {
    sucesso:
      resultadoAcao.sucesso,

    conversaId:
      estado.id,

    intencao:
      resultadoIntencao.intencao,

    confianca:
      resultadoIntencao.confianca,

    acaoExecutada:
      resultadoAcao.executada,

    resposta:
      resultadoAcao.resposta,

    etapaAnterior,

    proximaEtapa:
      resultadoAcao.proximaEtapa,

    dados:
      resultadoAcao.dados,
  };
}
