import { NextResponse } from "next/server";
import {
  obterOuCriarEstadoConversa,
} from "@/lib/conversation/estado";

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

    if (
      !/^\d+$/.test(empresaIdTexto) ||
      !contato
    ) {
      return NextResponse.json(
        {
          status: "erro",
          mensagem:
            "Informe empresaId e contato válidos.",
        },
        { status: 400 },
      );
    }

    const estado =
      await obterOuCriarEstadoConversa(
        BigInt(empresaIdTexto),
        contato,
      );

    return NextResponse.json({
      status: "ok",
      estado: {
        id: estado.id.toString(),
        empresaId:
          estado.empresaId.toString(),
        contato: estado.contato,
        nomeContato:
          estado.nomeContato,
        etapa: estado.etapa,
        clienteId:
          estado.clienteId?.toString() ??
          null,
        ultimoProdutoId:
          estado.ultimoProdutoId?.toString() ??
          null,
        ultimaPropostaId:
          estado.ultimaPropostaId?.toString() ??
          null,
        quantidade:
          estado.quantidade,
        contexto:
          estado.contexto,
        atualizadoEm:
          estado.atualizadoEm.toISOString(),
      },
    });
  } catch (error) {
    console.error(
      "Erro ao testar estado:",
      error,
    );

    return NextResponse.json(
      {
        status: "erro",
        mensagem:
          "Não foi possível carregar a conversa.",
        detalhe:
          error instanceof Error
            ? error.message
            : "Erro desconhecido.",
      },
      { status: 500 },
    );
  }
}
