import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type LeadBanco = {
  id: bigint;
  empresa: string | null;
  responsavel: string | null;
  whatsapp: string | null;
  email: string | null;
  segmento: string | null;
  cidade: string | null;
  estado: string | null;
  origem: string | null;
  temperatura: string;
  status: string;
  vendedor_id: bigint | null;
  vendedor_nome: string | null;
  valor_estimado: string;
  ultimo_contato: Date | null;
  proximo_contato: Date | null;
  observacoes: string | null;
  criado_em: Date;
  atualizado_em: Date;
};

type VendedorBanco = {
  id: bigint;
  nome: string;
  email: string | null;
  whatsapp: string | null;
};

function serializarLead(lead: LeadBanco) {
  return {
    ...lead,
    id: lead.id.toString(),
    vendedor_id: lead.vendedor_id?.toString() ?? null,
    valor_estimado: Number(lead.valor_estimado ?? 0),
    ultimo_contato: lead.ultimo_contato?.toISOString() ?? null,
    proximo_contato: lead.proximo_contato?.toISOString() ?? null,
    criado_em: lead.criado_em.toISOString(),
    atualizado_em: lead.atualizado_em.toISOString(),
  };
}

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

export async function GET() {
  try {
    const prisma = getPrisma();

    const [leads, vendedores] = await Promise.all([
      prisma.$queryRaw<LeadBanco[]>`
        SELECT
          l.id,
          l.empresa,
          l.responsavel,
          l.whatsapp,
          l.email,
          l.segmento,
          l.cidade,
          l.estado,
          l.origem,
          l.temperatura,
          l.status,
          l.vendedor_id,
          v.nome AS vendedor_nome,
          l.valor_estimado::text,
          l.ultimo_contato,
          l.proximo_contato,
          l.observacoes,
          l.criado_em,
          l.atualizado_em
        FROM comercial.leads l
        LEFT JOIN comercial.vendedores v
          ON v.id = l.vendedor_id
        ORDER BY
          l.proximo_contato ASC NULLS LAST,
          l.criado_em DESC
      `,

      prisma.$queryRaw<VendedorBanco[]>`
        SELECT
          id,
          nome,
          email,
          whatsapp
        FROM comercial.vendedores
        WHERE status = 'ativo'
        ORDER BY nome
      `,
    ]);

    return NextResponse.json({
      status: "sucesso",
      leads: leads.map(serializarLead),
      vendedores: vendedores.map((vendedor) => ({
        ...vendedor,
        id: vendedor.id.toString(),
      })),
    });
  } catch (error) {
    console.error("Erro ao listar Leads:", error);

    return NextResponse.json(
      {
        status: "erro",
        mensagem: "Não foi possível carregar os Leads.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    const vendedorIdTexto = String(body.vendedor_id ?? "").trim();

    const vendedorId =
      /^\d+$/.test(vendedorIdTexto) && vendedorIdTexto !== "0"
        ? BigInt(vendedorIdTexto)
        : null;

    const prisma = getPrisma();

    const resultado = await prisma.$queryRaw<LeadBanco[]>`
      INSERT INTO comercial.leads (
        empresa,
        responsavel,
        whatsapp,
        email,
        segmento,
        cidade,
        estado,
        origem,
        temperatura,
        status,
        vendedor_id,
        valor_estimado,
        ultimo_contato,
        proximo_contato,
        observacoes,
        atualizado_em
      )
      VALUES (
        ${empresa},
        ${responsavel},
        ${whatsapp},
        ${textoOpcional(body.email)},
        ${textoOpcional(body.segmento)},
        ${textoOpcional(body.cidade)},
        ${textoOpcional(body.estado)?.toUpperCase().slice(0, 2) ?? null},
        ${textoOpcional(body.origem)},
        ${textoOpcional(body.temperatura) ?? "frio"},
        ${textoOpcional(body.status) ?? "novo"},
        ${vendedorId},
        ${numeroSeguro(body.valor_estimado)},
        ${dataOpcional(body.ultimo_contato)},
        ${dataOpcional(body.proximo_contato)},
        ${textoOpcional(body.observacoes)},
        NOW()
      )
      RETURNING
        id,
        empresa,
        responsavel,
        whatsapp,
        email,
        segmento,
        cidade,
        estado,
        origem,
        temperatura,
        status,
        vendedor_id,
        NULL::varchar AS vendedor_nome,
        valor_estimado::text,
        ultimo_contato,
        proximo_contato,
        observacoes,
        criado_em,
        atualizado_em
    `;

    return NextResponse.json(
      {
        status: "sucesso",
        mensagem: "Lead cadastrado com sucesso.",
        lead: serializarLead(resultado[0]),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Erro ao cadastrar Lead:", error);

    return NextResponse.json(
      {
        status: "erro",
        mensagem: "Não foi possível cadastrar o Lead.",
      },
      { status: 500 },
    );
  }
}
