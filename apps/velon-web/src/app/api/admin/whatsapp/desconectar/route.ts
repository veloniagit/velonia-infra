import { NextResponse } from "next/server";
import {
  evolutionFetch,
  evolutionInstance,
} from "@/lib/evolution";
import { validarAdminWhatsapp } from "@/lib/admin-whatsapp";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  const erroAutenticacao =
    validarAdminWhatsapp(request);

  if (erroAutenticacao) {
    return erroAutenticacao;
  }

  try {
    const resultado =
      await evolutionFetch<unknown>(
        `/instance/logout/${encodeURIComponent(
          evolutionInstance,
        )}`,
        {
          method: "DELETE",
        },
      );

    return NextResponse.json({
      status: "ok",
      instancia: evolutionInstance,
      desconectada: true,
      resultado,
    });
  } catch (error) {
    console.error(
      "Erro ao desconectar WhatsApp:",
      error,
    );

    return NextResponse.json(
      {
        status: "erro",
        mensagem:
          "Não foi possível desconectar a instância.",
        detalhe:
          error instanceof Error
            ? error.message
            : "Erro desconhecido.",
      },
      { status: 502 },
    );
  }
}
