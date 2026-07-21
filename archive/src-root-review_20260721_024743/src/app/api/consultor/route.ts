import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const mensagem =
      body?.mensagem?.trim() ?? "";

    if (!mensagem) {
      return NextResponse.json(
        {
          status: "erro",
          mensagem:
            "Informe a mensagem do cliente.",
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json({
      status: "ok",
      mensagemRecebida: mensagem,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        status: "erro",
        mensagem: "JSON inválido.",
      },
      {
        status: 400,
      },
    );
  }
}
