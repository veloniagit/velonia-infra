import { getPrisma } from "@/lib/prisma";

import {
  atualizarEstadoConversa,
  type EstadoConversa,
} from "@/lib/conversation/estado";

type ClienteBanco = {
  id: bigint;
  responsavel: string | null;
  whatsapp: string | null;
};

export type ResultadoSalvarNome = {
  sucesso: boolean;
  clienteId: bigint;
  nome: string;
  resposta: string;
};

function normalizarNome(valor: string): string {
  return valor
    .trim()
    .replace(/\s+/g, " ");
}

function nomeValido(nome: string): boolean {
  const partes = nome
    .split(" ")
    .filter(Boolean);

  return (
    nome.length >= 3 &&
    nome.length <= 150 &&
    partes.length >= 2 &&
    partes.every((parte) =>
      /^[A-Za-zÀ-ÿ'-]+$/.test(parte),
    )
  );
}

export async function executarSalvarNome(
  estado: EstadoConversa,
  nomeInformado: unknown,
  mensagem: string,
): Promise<ResultadoSalvarNome> {
  const nome = normalizarNome(
    String(nomeInformado ?? mensagem),
  );

  if (!nomeValido(nome)) {
    throw new Error(
      "Informe seu nome completo para continuarmos.",
    );
  }

  const prisma = getPrisma();

  const resultado = await prisma.$transaction(
    async (tx) => {
      const existentes =
        await tx.$queryRaw<ClienteBanco[]>`
          SELECT
            id,
            responsavel,
            whatsapp
          FROM crm.clientes
          WHERE empresa_id = ${estado.empresaId}
            AND regexp_replace(
              COALESCE(whatsapp, ''),
              '\\D',
              '',
              'g'
            ) = ${estado.contato}
          ORDER BY id DESC
          LIMIT 1
        `;

      let clienteId =
        existentes[0]?.id ?? null;

      if (clienteId) {
        await tx.$executeRaw`
          UPDATE crm.clientes
          SET
            responsavel = ${nome},
            whatsapp = ${estado.contato},
            status = 'ativo',
            atualizado_em = NOW()
          WHERE id = ${clienteId}
            AND empresa_id = ${estado.empresaId}
        `;
      } else {
        const criados =
          await tx.$queryRaw<
            Array<{ id: bigint }>
          >`
            INSERT INTO crm.clientes (
              empresa_id,
              responsavel,
              whatsapp,
              status,
              criado_em,
              atualizado_em
            )
            VALUES (
              ${estado.empresaId},
              ${nome},
              ${estado.contato},
              'ativo',
              NOW(),
              NOW()
            )
            RETURNING id
          `;

        clienteId =
          criados[0]?.id ?? null;
      }

      if (!clienteId) {
        throw new Error(
          "Não foi possível criar ou localizar o cliente.",
        );
      }

      if (estado.ultimaPropostaId) {
        await tx.$executeRaw`
          UPDATE comercial.propostas
          SET
            cliente_id = ${clienteId},
            atualizado_em = NOW()
          WHERE id = ${estado.ultimaPropostaId}
        `;
      }

      return {
        clienteId,
      };
    },
  );

  const resposta =
    `Obrigado, ${nome}. ` +
    "Agora informe seu CPF ou CNPJ.";

  await atualizarEstadoConversa(
    estado.id,
    {
      etapa: "aguardando_documento",
      nomeContato: nome,
      clienteId: resultado.clienteId,
      ultimaMensagemCliente: mensagem,
      ultimaRespostaIa: resposta,
      contexto: {
        cliente: {
          id: resultado.clienteId.toString(),
          nome,
          whatsapp: estado.contato,
        },
      },
    },
  );

  return {
    sucesso: true,
    clienteId: resultado.clienteId,
    nome,
    resposta,
  };
}
