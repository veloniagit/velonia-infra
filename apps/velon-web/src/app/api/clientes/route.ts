import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ClienteBanco = {
  id: bigint;
  empresa_id: bigint;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  segmento: string | null;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  responsavel: string | null;
  whatsapp: string | null;
  email: string | null;
  plano: string | null;
  valor_implantacao: string;
  mensalidade: string;
  data_inicio: Date | null;
  data_cancelamento: Date | null;
  status: string;
  observacoes: string | null;
  criado_em: Date;
  atualizado_em: Date;
};

export async function GET() {
  try {
    const prisma = getPrisma();

    const clientes = await prisma.$queryRaw<ClienteBanco[]>`
      SELECT
        c.id,
        c.empresa_id,
        e.razao_social,
        e.nome_fantasia,
        e.cnpj,
        e.segmento,
        e.telefone,
        e.cidade,
        e.estado,
        c.responsavel,
        c.whatsapp,
        c.email,
        c.plano,
        c.valor_implantacao::text,
        c.mensalidade::text,
        c.data_inicio,
        c.data_cancelamento,
        c.status,
        c.observacoes,
        c.criado_em,
        c.atualizado_em
      FROM crm.clientes AS c
      INNER JOIN crm.empresas AS e
        ON e.id = c.empresa_id
      ORDER BY c.criado_em DESC, c.id DESC
      LIMIT 100
    `;

    return NextResponse.json({
      total: clientes.length,
      clientes: clientes.map((cliente) => ({
        id: cliente.id.toString(),
        empresaId: cliente.empresa_id.toString(),
        razaoSocial: cliente.razao_social,
        nomeFantasia: cliente.nome_fantasia,
        cnpj: cliente.cnpj,
        segmento: cliente.segmento,
        telefone: cliente.telefone,
        cidade: cliente.cidade,
        estado: cliente.estado,
        responsavel: cliente.responsavel,
        whatsapp: cliente.whatsapp,
        email: cliente.email,
        plano: cliente.plano,
        valorImplantacao: Number(cliente.valor_implantacao),
        mensalidade: Number(cliente.mensalidade),
        dataInicio: cliente.data_inicio,
        dataCancelamento: cliente.data_cancelamento,
        status: cliente.status,
        observacoes: cliente.observacoes,
        criadoEm: cliente.criado_em,
        atualizadoEm: cliente.atualizado_em,
      })),
    });
  } catch (error) {
    console.error("Erro ao listar clientes:", error);

    return NextResponse.json(
      {
        status: "erro",
        mensagem: "Não foi possível listar os clientes.",
      },
      { status: 500 },
    );
  }
}
