import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const prisma = getPrisma();

    const resultado = await prisma.$queryRaw<
      Array<{ banco: string; agora: Date }>
    >`
      SELECT
        current_database() AS banco,
        NOW() AS agora
    `;

    return NextResponse.json({
      status: "ok",
      banco: resultado[0]?.banco,
      agora: resultado[0]?.agora,
    });
  } catch (error) {
    console.error("Erro ao consultar PostgreSQL:", error);

    return NextResponse.json(
      {
        status: "erro",
        mensagem: "Não foi possível consultar o PostgreSQL.",
      },
      { status: 500 },
    );
  }
}
