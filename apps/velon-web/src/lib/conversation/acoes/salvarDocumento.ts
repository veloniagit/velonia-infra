import { getPrisma } from "@/lib/prisma";

import {
  atualizarEstadoConversa,
  type EstadoConversa,
} from "@/lib/conversation/estado";

export type ResultadoSalvarDocumento = {
  sucesso: boolean;
  documento: string;
  tipoDocumento: "CPF" | "CNPJ";
  resposta: string;
};

function somenteNumeros(valor: unknown): string {
  return String(valor ?? "").replace(/\D/g, "");
}

function todosDigitosIguais(valor: string): boolean {
  return /^(\d)\1+$/.test(valor);
}

function validarCpf(cpf: string): boolean {
  if (
    cpf.length !== 11 ||
    todosDigitosIguais(cpf)
  ) {
    return false;
  }

  let soma = 0;

  for (let indice = 0; indice < 9; indice += 1) {
    soma += Number(cpf[indice]) * (10 - indice);
  }

  let digito = (soma * 10) % 11;

  if (digito === 10) {
    digito = 0;
  }

  if (digito !== Number(cpf[9])) {
    return false;
  }

  soma = 0;

  for (let indice = 0; indice < 10; indice += 1) {
    soma += Number(cpf[indice]) * (11 - indice);
  }

  digito = (soma * 10) % 11;

  if (digito === 10) {
    digito = 0;
  }

  return digito === Number(cpf[10]);
}

function calcularDigitoCnpj(
  base: string,
  pesos: number[],
): number {
  const soma = base
    .split("")
    .reduce(
      (total, numero, indice) =>
        total + Number(numero) * pesos[indice],
      0,
    );

  const resto = soma % 11;

  return resto < 2 ? 0 : 11 - resto;
}

function validarCnpj(cnpj: string): boolean {
  if (
    cnpj.length !== 14 ||
    todosDigitosIguais(cnpj)
  ) {
    return false;
  }

  const basePrimeiro = cnpj.slice(0, 12);

  const primeiro = calcularDigitoCnpj(
    basePrimeiro,
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );

  const baseSegundo =
    basePrimeiro + String(primeiro);

  const segundo = calcularDigitoCnpj(
    baseSegundo,
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );

  return (
    primeiro === Number(cnpj[12]) &&
    segundo === Number(cnpj[13])
  );
}

export async function executarSalvarDocumento(
  estado: EstadoConversa,
  documentoInformado: unknown,
  mensagem: string,
): Promise<ResultadoSalvarDocumento> {
  if (!estado.clienteId) {
    throw new Error(
      "A conversa ainda não possui cliente associado.",
    );
  }

  const documento = somenteNumeros(
    documentoInformado ?? mensagem,
  );

  const tipoDocumento =
    documento.length === 11
      ? "CPF"
      : documento.length === 14
        ? "CNPJ"
        : null;

  if (!tipoDocumento) {
    throw new Error(
      "Informe um CPF com 11 dígitos ou CNPJ com 14 dígitos.",
    );
  }

  const valido =
    tipoDocumento === "CPF"
      ? validarCpf(documento)
      : validarCnpj(documento);

  if (!valido) {
    throw new Error(
      `${tipoDocumento} inválido. Confira os números e tente novamente.`,
    );
  }

  const prisma = getPrisma();

  await prisma.$transaction(async (tx) => {
    const documentoExistente =
      await tx.$queryRaw<Array<{ id: bigint }>>`
        SELECT id
        FROM crm.clientes
        WHERE empresa_id = ${estado.empresaId}
          AND cpf_cnpj = ${documento}
          AND id <> ${estado.clienteId}
        LIMIT 1
      `;

    if (documentoExistente.length > 0) {
      throw new Error(
        `${tipoDocumento} já está vinculado a outro cliente.`,
      );
    }

    const atualizados = await tx.$executeRaw`
      UPDATE crm.clientes
      SET
        cpf_cnpj = ${documento},
        atualizado_em = NOW()
      WHERE id = ${estado.clienteId}
        AND empresa_id = ${estado.empresaId}
    `;

    if (atualizados === 0) {
      throw new Error(
        "Cliente não encontrado para salvar o documento.",
      );
    }
  });

  const resposta =
    `${tipoDocumento} salvo com sucesso. ` +
    "Agora informe seu CEP.";

  await atualizarEstadoConversa(
    estado.id,
    {
      etapa: "aguardando_cep",
      ultimaMensagemCliente: mensagem,
      ultimaRespostaIa: resposta,
      contexto: {
        documento: {
          tipo: tipoDocumento,
          numero: documento,
          validado: true,
        },
      },
    },
  );

  return {
    sucesso: true,
    documento,
    tipoDocumento,
    resposta,
  };
}
