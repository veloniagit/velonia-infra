import { NextResponse } from "next/server";
import {
  carregarEstadoConversa,
} from "@/lib/conversation/estado";
import {
  identificarIntencao,
} from "@/lib/conversation/intencao";

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
      await carregarEstadoConversa(
        BigInt(empresaIdTexto),
        contato,
      );

    const resultado =
      identificarIntencao(
        mensagem,
        estado,
      );

    return NextResponse.json({
      status: "ok",
      estadoAtual:
        estado?.etapa ?? "sem_conversa",
      resultado,
    });
  } catch (error) {
    console.error(
      "Erro ao identificar intenção:",
      error,
    );

    return NextResponse.json(
      {
        status: "erro",
        mensagem:
          "Não foi possível identificar a intenção.",
        detalhe:
          error instanceof Error
            ? error.message
            : "Erro desconhecido.",
      },
      { status: 500 },
    );
  }
}
