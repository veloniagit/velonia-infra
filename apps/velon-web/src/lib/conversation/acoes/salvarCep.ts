import { getPrisma } from "@/lib/prisma";

import {
  atualizarEstadoConversa,
  type EstadoConversa,
  type EtapaConversa,
} from "@/lib/conversation/estado";

type ViaCepResposta = {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  ibge?: string;
  erro?: boolean | string;
};

export type ResultadoSalvarCep = {
  sucesso: boolean;
  cep: string;
  logradouro: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  resposta: string;
  proximaEtapa: EtapaConversa;
};

function somenteNumeros(valor: unknown): string {
  return String(valor ?? "").replace(/\D/g, "");
}

function textoOuNull(
  valor: string | undefined,
): string | null {
  const texto = valor?.trim();

  return texto ? texto : null;
}

export async function executarSalvarCep(
  estado: EstadoConversa,
  cepInformado: unknown,
  mensagem: string,
): Promise<ResultadoSalvarCep> {
  if (!estado.clienteId) {
    throw new Error(
      "A conversa ainda não possui cliente associado.",
    );
  }

  const cep = somenteNumeros(
    cepInformado ?? mensagem,
  );

  if (!/^\d{8}$/.test(cep)) {
    throw new Error(
      "Informe um CEP válido com 8 números.",
    );
  }

  let enderecoCep: ViaCepResposta;

  try {
    const respostaCep = await fetch(
      `https://viacep.com.br/ws/${cep}/json/`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "VelON-OS/1.0",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!respostaCep.ok) {
      throw new Error(
        `ViaCEP retornou HTTP ${respostaCep.status}.`,
      );
    }

    enderecoCep =
      (await respostaCep.json()) as ViaCepResposta;
  } catch (error) {
    console.error(
      "Erro ao consultar ViaCEP:",
      error,
    );

    throw new Error(
      "Não foi possível consultar o CEP agora. Tente novamente em alguns instantes.",
    );
  }

  if (
    enderecoCep.erro === true ||
    enderecoCep.erro === "true"
  ) {
    throw new Error(
      "O CEP informado não foi encontrado.",
    );
  }

  const logradouro =
    textoOuNull(enderecoCep.logradouro);

  const bairro =
    textoOuNull(enderecoCep.bairro);

  const cidade =
    textoOuNull(enderecoCep.localidade);

  const estadoUf =
    textoOuNull(enderecoCep.uf)?.toUpperCase() ??
    null;

  const proximaEtapa: EtapaConversa =
    logradouro
      ? "aguardando_numero"
      : "aguardando_endereco";

  const resposta = logradouro
    ? (
        `Localizei ${logradouro}` +
        `${bairro ? `, ${bairro}` : ""}` +
        `${cidade ? `, ${cidade}` : ""}` +
        `${estadoUf ? `/${estadoUf}` : ""}. ` +
        "Agora informe o número do imóvel. " +
        "Você também pode incluir o complemento."
      )
    : (
        `CEP localizado em ${cidade ?? "sua cidade"}` +
        `${estadoUf ? `/${estadoUf}` : ""}. ` +
        "Agora informe o nome completo da rua ou avenida."
      );

  const prisma = getPrisma();

  const atualizados = await prisma.$executeRaw`
    UPDATE crm.clientes
    SET
      cep = ${cep},
      endereco = ${logradouro},
      bairro = ${bairro},
      cidade = ${cidade},
      estado = ${estadoUf},
      atualizado_em = NOW()
    WHERE id = ${estado.clienteId}
      AND empresa_id = ${estado.empresaId}
  `;

  if (atualizados === 0) {
    throw new Error(
      "Cliente não encontrado para salvar o endereço.",
    );
  }

  await atualizarEstadoConversa(
    estado.id,
    {
      etapa: proximaEtapa,
      ultimaMensagemCliente: mensagem,
      ultimaRespostaIa: resposta,
      contexto: {
        endereco: {
          cep,
          logradouro,
          bairro,
          cidade,
          estado: estadoUf,
          origem: "viacep",
          ibge: enderecoCep.ibge ?? null,
        },
      },
    },
  );

  return {
    sucesso: true,
    cep,
    logradouro,
    bairro,
    cidade,
    estado: estadoUf,
    resposta,
    proximaEtapa,
  };
}
