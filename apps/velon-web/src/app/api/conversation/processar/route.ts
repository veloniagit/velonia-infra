import { NextResponse } from "next/server";

import {
  processarMensagem,
} from "@/lib/conversation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(
  request: Request,
) {
  try {
    const corpo =
      await request.json();

    const empresaIdTexto =
      String(
        corpo.empresaId ?? "",
      );

    const contato =
      String(
        corpo.contato ?? "",
      ).replace(/\D/g, "");

    const mensagem =
      String(
        corpo.mensagem ?? "",
      ).trim();

    if (
      !/^\d+$/.test(
        empresaIdTexto,
      ) ||
      !contato ||
      !mensagem
    ) {
      return NextResponse.json(
        {
          status: "erro",
          mensagem:
            "Informe empresaId, contato e mensagem válidos.",
        },
        {
          status: 400,
        },
      );
    }

    const resultado =
      await processarMensagem({
        empresaId:
          BigInt(empresaIdTexto),

        contato,

        mensagem,
      });

    return NextResponse.json({
      status: "ok",

      processamento: {
        sucesso:
          resultado.sucesso,

        conversaId:
          resultado.conversaId.toString(),

        intencao:
          resultado.intencao,

        confianca:
          resultado.confianca,

        acaoExecutada:
          resultado.acaoExecutada,

        etapaAnterior:
          resultado.etapaAnterior,

        proximaEtapa:
          resultado.proximaEtapa,

        resposta:
          resultado.resposta,

        dados:
          resultado.dados,
      },
    });
  } catch (error) {
    console.error(
      "Erro no motor conversacional:",
      error,
    );

    return NextResponse.json(
      {
        status: "erro",

        mensagem:
          "Não foi possível processar a mensagem.",

        detalhe:
          error instanceof Error
            ? error.message
            : "Erro desconhecido.",
      },
      {
        status: 500,
      },
    );
  }
}
