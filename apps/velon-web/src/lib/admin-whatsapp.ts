import { NextResponse } from "next/server";

export function validarAdminWhatsapp(
  request: Request,
): NextResponse | null {
  const tokenConfigurado =
    process.env.WHATSAPP_ADMIN_TOKEN;

  if (!tokenConfigurado) {
    return NextResponse.json(
      {
        status: "erro",
        mensagem:
          "WHATSAPP_ADMIN_TOKEN não configurado.",
      },
      { status: 500 },
    );
  }

  const tokenRecebido =
    request.headers.get("x-admin-token");

  if (tokenRecebido !== tokenConfigurado) {
    return NextResponse.json(
      {
        status: "erro",
        mensagem: "Acesso não autorizado.",
      },
      { status: 401 },
    );
  }

  return null;
}
