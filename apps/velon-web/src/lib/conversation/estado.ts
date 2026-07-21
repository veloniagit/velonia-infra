import { getPrisma } from "@/lib/prisma";

export type EtapaConversa =
  | "inicio"
  | "buscando_produto"
  | "produto_encontrado"
  | "aguardando_quantidade"
  | "oferecendo_orcamento"
  | "orcamento_criado"
  | "aguardando_confirmacao"
  | "aguardando_nome"
  | "aguardando_documento"
  | "aguardando_cep"
  | "aguardando_endereco"
  | "aguardando_numero"
  | "aguardando_pagamento"
  | "pagamento_pendente"
  | "pagamento_confirmado"
  | "pedido_criado"
  | "pedido_enviado"
  | "finalizado";

export type ContextoConversa =
  Record<string, unknown>;

export type EstadoConversa = {
  id: bigint;
  empresaId: bigint;
  contato: string;
  nomeContato: string | null;
  etapa: EtapaConversa;
  clienteId: bigint | null;
  ultimoProdutoId: bigint | null;
  ultimaPropostaId: bigint | null;
  quantidade: number;
  ultimaMensagemCliente: string | null;
  ultimaRespostaIa: string | null;
  contexto: ContextoConversa;
  atualizadoEm: Date;
};

type EstadoBanco = {
  id: bigint;
  empresa_id: bigint;
  contato: string;
  nome_contato: string | null;
  etapa: string;
  cliente_id: bigint | null;
  ultimo_produto_id: bigint | null;
  ultima_proposta_id: bigint | null;
  quantidade: string;
  ultima_mensagem_cliente: string | null;
  ultima_resposta_ia: string | null;
  contexto: ContextoConversa;
  atualizado_em: Date;
};

function mapearEstado(
  estado: EstadoBanco,
): EstadoConversa {
  return {
    id: estado.id,
    empresaId: estado.empresa_id,
    contato: estado.contato,
    nomeContato: estado.nome_contato,
    etapa: estado.etapa as EtapaConversa,
    clienteId: estado.cliente_id,
    ultimoProdutoId:
      estado.ultimo_produto_id,
    ultimaPropostaId:
      estado.ultima_proposta_id,
    quantidade: Number(
      estado.quantidade ?? 1,
    ),
    ultimaMensagemCliente:
      estado.ultima_mensagem_cliente,
    ultimaRespostaIa:
      estado.ultima_resposta_ia,
    contexto: estado.contexto ?? {},
    atualizadoEm: estado.atualizado_em,
  };
}

export async function carregarEstadoConversa(
  empresaId: bigint,
  contato: string,
): Promise<EstadoConversa | null> {
  const prisma = getPrisma();

  const resultados =
    await prisma.$queryRaw<EstadoBanco[]>`
      SELECT
        id,
        empresa_id,
        contato,
        nome_contato,
        etapa,
        cliente_id,
        ultimo_produto_id,
        ultima_proposta_id,
        quantidade::text,
        ultima_mensagem_cliente,
        ultima_resposta_ia,
        contexto,
        atualizado_em
      FROM comercial.conversas_ia
      WHERE empresa_id = ${empresaId}
        AND canal = 'whatsapp'
        AND contato = ${contato}
      LIMIT 1
    `;

  const estado = resultados[0];

  return estado
    ? mapearEstado(estado)
    : null;
}

export async function criarEstadoConversa(
  empresaId: bigint,
  contato: string,
): Promise<EstadoConversa> {
  const prisma = getPrisma();

  const resultados =
    await prisma.$queryRaw<EstadoBanco[]>`
      INSERT INTO comercial.conversas_ia (
        empresa_id,
        canal,
        contato,
        etapa,
        quantidade,
        contexto,
        criado_em,
        atualizado_em
      )
      VALUES (
        ${empresaId},
        'whatsapp',
        ${contato},
        'inicio',
        1,
        '{}'::jsonb,
        NOW(),
        NOW()
      )
      ON CONFLICT (
        empresa_id,
        canal,
        contato
      )
      DO UPDATE SET
        atualizado_em =
          comercial.conversas_ia.atualizado_em
      RETURNING
        id,
        empresa_id,
        contato,
        nome_contato,
        etapa,
        cliente_id,
        ultimo_produto_id,
        ultima_proposta_id,
        quantidade::text,
        ultima_mensagem_cliente,
        ultima_resposta_ia,
        contexto,
        atualizado_em
    `;

  const estado = resultados[0];

  if (!estado) {
    throw new Error(
      "Não foi possível criar o estado da conversa.",
    );
  }

  return mapearEstado(estado);
}

export async function obterOuCriarEstadoConversa(
  empresaId: bigint,
  contato: string,
): Promise<EstadoConversa> {
  const existente =
    await carregarEstadoConversa(
      empresaId,
      contato,
    );

  if (existente) {
    return existente;
  }

  return criarEstadoConversa(
    empresaId,
    contato,
  );
}

type AtualizarEstadoInput = {
  etapa?: EtapaConversa;
  nomeContato?: string | null;
  clienteId?: bigint | null;
  ultimoProdutoId?: bigint | null;
  ultimaPropostaId?: bigint | null;
  quantidade?: number;
  ultimaMensagemCliente?: string | null;
  ultimaRespostaIa?: string | null;
  contexto?: ContextoConversa;
};

export async function atualizarEstadoConversa(
  estadoId: bigint,
  dados: AtualizarEstadoInput,
): Promise<EstadoConversa> {
  const prisma = getPrisma();

  const atual = await prisma.$queryRaw<
    EstadoBanco[]
  >`
    SELECT
      id,
      empresa_id,
      contato,
      nome_contato,
      etapa,
      cliente_id,
      ultimo_produto_id,
      ultima_proposta_id,
      quantidade::text,
      ultima_mensagem_cliente,
      ultima_resposta_ia,
      contexto,
      atualizado_em
    FROM comercial.conversas_ia
    WHERE id = ${estadoId}
    LIMIT 1
  `;

  const estadoAtual = atual[0];

  if (!estadoAtual) {
    throw new Error(
      "Conversa não encontrada.",
    );
  }

  const novoContexto =
    dados.contexto === undefined
      ? estadoAtual.contexto
      : {
          ...(estadoAtual.contexto ?? {}),
          ...dados.contexto,
        };

  const resultados =
    await prisma.$queryRaw<EstadoBanco[]>`
      UPDATE comercial.conversas_ia
      SET
        etapa = ${
          dados.etapa ??
          estadoAtual.etapa
        },
        nome_contato = ${
          dados.nomeContato === undefined
            ? estadoAtual.nome_contato
            : dados.nomeContato
        },
        cliente_id = ${
          dados.clienteId === undefined
            ? estadoAtual.cliente_id
            : dados.clienteId
        },
        ultimo_produto_id = ${
          dados.ultimoProdutoId ===
          undefined
            ? estadoAtual.ultimo_produto_id
            : dados.ultimoProdutoId
        },
        ultima_proposta_id = ${
          dados.ultimaPropostaId ===
          undefined
            ? estadoAtual.ultima_proposta_id
            : dados.ultimaPropostaId
        },
        quantidade = ${
          dados.quantidade ??
          Number(estadoAtual.quantidade)
        },
        ultima_mensagem_cliente = ${
          dados.ultimaMensagemCliente ===
          undefined
            ? estadoAtual.ultima_mensagem_cliente
            : dados.ultimaMensagemCliente
        },
        ultima_resposta_ia = ${
          dados.ultimaRespostaIa ===
          undefined
            ? estadoAtual.ultima_resposta_ia
            : dados.ultimaRespostaIa
        },
        contexto =
          ${JSON.stringify(
            novoContexto,
          )}::jsonb,
        atualizado_em = NOW()
      WHERE id = ${estadoId}
      RETURNING
        id,
        empresa_id,
        contato,
        nome_contato,
        etapa,
        cliente_id,
        ultimo_produto_id,
        ultima_proposta_id,
        quantidade::text,
        ultima_mensagem_cliente,
        ultima_resposta_ia,
        contexto,
        atualizado_em
    `;

  const estadoAtualizado =
    resultados[0];

  if (!estadoAtualizado) {
    throw new Error(
      "Não foi possível atualizar a conversa.",
    );
  }

  return mapearEstado(
    estadoAtualizado,
  );
}

export async function finalizarConversa(
  estadoId: bigint,
  respostaFinal?: string,
): Promise<EstadoConversa> {
  return atualizarEstadoConversa(
    estadoId,
    {
      etapa: "finalizado",
      ultimaRespostaIa:
        respostaFinal,
      contexto: {
        finalizadoEm:
          new Date().toISOString(),
      },
    },
  );
}
