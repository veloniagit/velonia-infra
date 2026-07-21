import { getPrisma } from "@/lib/prisma";

import {
  atualizarEstadoConversa,
  type EstadoConversa,
} from "@/lib/conversation/estado";

export type ResultadoSalvarNumero = {
  sucesso: boolean;
  numero: string;
  complemento: string | null;
  resposta: string;
};

function interpretarNumero(
  valor: unknown,
): {
  numero: string;
  complemento: string | null;
} {
  const texto = String(valor ?? "")
    .trim()
    .replace(/\s+/g, " ");

  if (!texto || texto.length > 120) {
    throw new Error(
      "Informe o número do imóvel. Você também pode incluir o complemento.",
    );
  }

  const partes = texto
    .split(/[,;-]/)
    .map((parte) => parte.trim())
    .filter(Boolean);

  const numero = partes[0] ?? texto;

  const complemento =
    partes.length > 1
      ? partes.slice(1).join(", ")
      : null;

  if (
    numero.length < 1 ||
    numero.length > 30
  ) {
    throw new Error(
      "Informe um número de imóvel válido.",
    );
  }

  return {
    numero,
    complemento,
  };
}

export async function executarSalvarNumero(
  estado: EstadoConversa,
  numeroInformado: unknown,
  mensagem: string,
): Promise<ResultadoSalvarNumero> {
  if (!estado.clienteId) {
    throw new Error(
      "A conversa ainda não possui cliente associado.",
    );
  }

  const {
    numero,
    complemento,
  } = interpretarNumero(
    numeroInformado ?? mensagem,
  );

  const prisma = getPrisma();

  const atualizados = await prisma.$executeRaw`
    UPDATE crm.clientes
    SET
      numero = ${numero},
      complemento = ${complemento},
      atualizado_em = NOW()
    WHERE id = ${estado.clienteId}
      AND empresa_id = ${estado.empresaId}
  `;

  if (atualizados === 0) {
    throw new Error(
      "Cliente não encontrado para salvar o número.",
    );
  }

  const resposta =
    "Endereço registrado com sucesso. " +
    "Agora escolha a forma de pagamento: PIX, cartão ou boleto.";

  await atualizarEstadoConversa(
    estado.id,
    {
      etapa: "aguardando_pagamento",
      ultimaMensagemCliente: mensagem,
      ultimaRespostaIa: resposta,
      contexto: {
        endereco: {
          numero,
          complemento,
        },
      },
    },
  );

  return {
    sucesso: true,
    numero,
    complemento,
    resposta,
  };
}
