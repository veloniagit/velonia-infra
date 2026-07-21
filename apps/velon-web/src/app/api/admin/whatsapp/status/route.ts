import { NextResponse } from "next/server";
import {
  evolutionFetch,
  evolutionInstance,
} from "@/lib/evolution";
import { validarAdminWhatsapp } from "@/lib/admin-whatsapp";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type InstanciaEvolution = {
  id?: string;
  name?: string;
  connectionStatus?: string;
  ownerJid?: string | null;
  profileName?: string | null;
  profilePicUrl?: string | null;
  number?: string | null;
  updatedAt?: string;
  _count?: {
    Message?: number;
    Contact?: number;
    Chat?: number;
  };
};

export async function GET(request: Request) {
  const erroAutenticacao =
    validarAdminWhatsapp(request);

  if (erroAutenticacao) {
    return erroAutenticacao;
  }

  try {
    const instancias =
      await evolutionFetch<InstanciaEvolution[]>(
        "/instance/fetchInstances",
      );

    const instancia = instancias.find(
      (item) => item.name === evolutionInstance,
    );

    if (!instancia) {
      return NextResponse.json({
        status: "ok",
        evolutionOnline: true,
        instanciaEncontrada: false,
        instancia: evolutionInstance,
        connectionStatus: "not_found",
      });
    }

    return NextResponse.json({
      status: "ok",
      evolutionOnline: true,
      instanciaEncontrada: true,
      instancia: instancia.name,
      connectionStatus:
        instancia.connectionStatus ?? "unknown",
      conectado:
        instancia.connectionStatus === "open",
      ownerJid: instancia.ownerJid ?? null,
      profileName: instancia.profileName ?? null,
      profilePicUrl:
        instancia.profilePicUrl ?? null,
      numero: instancia.number ?? null,
      atualizadoEm:
        instancia.updatedAt ?? null,
      metricas: {
        mensagens:
          instancia._count?.Message ?? 0,
        contatos:
          instancia._count?.Contact ?? 0,
        conversas:
          instancia._count?.Chat ?? 0,
      },
    });
  } catch (error) {
    console.error(
      "Erro ao consultar Evolution API:",
      error,
    );

    return NextResponse.json(
      {
        status: "erro",
        evolutionOnline: false,
        mensagem:
          "Não foi possível consultar a Evolution API.",
        detalhe:
          error instanceof Error
            ? error.message
            : "Erro desconhecido.",
      },
      { status: 502 },
    );
  }
}
