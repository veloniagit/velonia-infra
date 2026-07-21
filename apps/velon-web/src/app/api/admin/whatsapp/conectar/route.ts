import { NextResponse } from "next/server";
import {
  evolutionFetch,
  evolutionInstance,
} from "@/lib/evolution";
import { validarAdminWhatsapp } from "@/lib/admin-whatsapp";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RespostaConexao = {
  pairingCode?: string | null;
  code?: string | null;
  base64?: string | null;
  count?: number;
};

export async function POST(request: Request) {
  const erroAutenticacao =
    validarAdminWhatsapp(request);

  if (erroAutenticacao) {
    return erroAutenticacao;
  }

  try {
    const resultado =
      await evolutionFetch<RespostaConexao>(
        `/instance/connect/${encodeURIComponent(
          evolutionInstance,
        )}`,
      );

    return NextResponse.json({
      status: "ok",
      instancia: evolutionInstance,
      qrCodeDisponivel: Boolean(
        resultado.base64,
      ),
      base64: resultado.base64 ?? null,
      pairingCode:
        resultado.pairingCode ?? null,
      count: resultado.count ?? 0,
    });
  } catch (error) {
    console.error(
      "Erro ao gerar QR Code:",
      error,
    );

    return NextResponse.json(
      {
        status: "erro",
        mensagem:
          "Não foi possível gerar o QR Code.",
        detalhe:
          error instanceof Error
            ? error.message
            : "Erro desconhecido.",
      },
      { status: 502 },
    );
  }
}
