import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function textoOpcional(valor: unknown): string | null {
  if (typeof valor !== "string") {
    return null;
  }

  const resultado = valor.trim();

  return resultado.length > 0 ? resultado : null;
}

function dataOpcional(valor: unknown): Date | null {
  if (typeof valor !== "string" || !valor.trim()) {
    return null;
  }

  const data = new Date(valor);

  return Number.isNaN(data.getTime()) ? null : data;
}

function numeroSeguro(valor: unknown): number {
  const convertido = Number(valor ?? 0);

  return Number.isFinite(convertido) && convertido >= 0
    ? convertido
    : 0;
}

function validarId(id: string): bigint | null {
  return /^\d+$/.test(id) ? BigInt(id) : null;
}

export async function PUT(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const leadId = validarId(id);

    if (!leadId) {
      return NextResponse.json(
        {
          status: "erro",
          mensagem: "Identificador do Lead inválido.",
        },
        { status: 400 },
      );
    }

    const body = await request.json();

    const empresa = textoOpcional(body.empresa);
    const responsavel = textoOpcional(body.responsavel);
    const whatsapp = textoOpcional(body.whatsapp);

    if (!empresa && !responsavel && !whatsapp) {
      return NextResponse.json(
        {
          status: "erro",
          mensagem:
            "Informe pelo menos empresa, responsável ou WhatsApp.",
        },
        { status: 400 },
      );
    }

    const vendedorId =
      body.vendedor_id &&
      /^\d+$/.test(String(body.vendedor_id))
        ? BigInt(body.vendedor_id)
        : null;

    const prisma = getPrisma();

    const resultado = await prisma.$executeRaw`
      UPDATE comercial.leads
      SET
        empresa = ${empresa},
        responsavel = ${responsavel},
        whatsapp = ${whatsapp},
        email = ${textoOpcional(body.email)},
        segmento = ${textoOpcional(body.segmento)},
        cidade = ${textoOpcional(body.cidade)},
        estado = ${
          textoOpcional(body.estado)?.toUpperCase().slice(0, 2) ??
          null
        },
        origem = ${textoOpcional(body.origem)},
        temperatura = ${
          textoOpcional(body.temperatura) ?? "frio"
        },
        status = ${textoOpcional(body.status) ?? "novo"},
        vendedor_id = ${vendedorId},
        valor_estimado = ${numeroSeguro(body.valor_estimado)},
        ultimo_contato = ${dataOpcional(body.ultimo_contato)},
        proximo_contato = ${dataOpcional(body.proximo_contato)},
        observacoes = ${textoOpcional(body.observacoes)},
        atualizado_em = NOW()
      WHERE id = ${leadId}
    `;

    if (resultado === 0) {
      return NextResponse.json(
        {
          status: "erro",
          mensagem: "Lead não encontrado.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      status: "sucesso",
      mensagem: "Lead atualizado com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao atualizar Lead:", error);

    return NextResponse.json(
      {
        status: "erro",
        mensagem: "Não foi possível atualizar o Lead.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const leadId = validarId(id);

    if (!leadId) {
      return NextResponse.json(
        {
          status: "erro",
          mensagem: "Identificador do Lead inválido.",
        },
        { status: 400 },
      );
    }

    const prisma = getPrisma();

    const oportunidades = await prisma.$queryRaw<
      Array<{ total: number }>
    >`
      SELECT COUNT(*)::int AS total
      FROM comercial.oportunidades
      WHERE lead_id = ${leadId}
    `;

    if ((oportunidades[0]?.total ?? 0) > 0) {
      return NextResponse.json(
        {
          status: "erro",
          mensagem:
            "Este Lead possui oportunidades e não pode ser excluído.",
        },
        { status: 409 },
      );
    }

    const resultado = await prisma.$executeRaw`
      DELETE FROM comercial.leads
      WHERE id = ${leadId}
    `;

    if (resultado === 0) {
      return NextResponse.json(
        {
          status: "erro",
          mensagem: "Lead não encontrado.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      status: "sucesso",
      mensagem: "Lead excluído com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao excluir Lead:", error);

    return NextResponse.json(
      {
        status: "erro",
        mensagem: "Não foi possível excluir o Lead.",
      },
      { status: 500 },
    );
  }
}
