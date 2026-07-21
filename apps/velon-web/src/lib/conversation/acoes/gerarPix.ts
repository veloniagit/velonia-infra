import { randomUUID } from "crypto";
import { getPrisma } from "@/lib/prisma";

import {
  atualizarEstadoConversa,
  type EstadoConversa,
} from "@/lib/conversation/estado";

type PropostaBanco = {
  id: bigint;
  numero: string | null;
  valor_total: string;
  status: string;
};

type PagamentoBanco = {
  id: bigint;
  txid: string | null;
  codigo_pix: string | null;
  valor: string;
  status: string;
};

export type ResultadoGerarPix = {
  sucesso: boolean;
  pagamentoId: bigint;
  propostaId: bigint;
  txid: string;
  codigoPix: string;
  valor: number;
  status: string;
  resposta: string;
};

function moeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function gerarTxid(): string {
  return (
    "VELON-" +
    randomUUID()
      .replace(/-/g, "")
      .slice(0, 24)
      .toUpperCase()
  );
}

function gerarCodigoPix(
  txid: string,
  valor: number,
): string {
  return (
    `PIX-SIMULADO|TXID:${txid}` +
    `|VALOR:${valor.toFixed(2)}`
  );
}

export async function executarGerarPix(
  estado: EstadoConversa,
  mensagem: string,
): Promise<ResultadoGerarPix> {
  if (!estado.clienteId) {
    throw new Error(
      "A conversa não possui cliente associado.",
    );
  }

  if (!estado.ultimaPropostaId) {
    throw new Error(
      "A conversa não possui orçamento associado.",
    );
  }

  const prisma = getPrisma();

  const resultado = await prisma.$transaction(
    async (tx) => {
      const propostas =
        await tx.$queryRaw<PropostaBanco[]>`
          SELECT
            id,
            numero,
            valor_total::text,
            status
          FROM comercial.propostas
          WHERE id = ${estado.ultimaPropostaId}
          LIMIT 1
          FOR UPDATE
        `;

      const proposta = propostas[0];

      if (!proposta) {
        throw new Error(
          "Orçamento não encontrado.",
        );
      }

      const valor = Number(
        proposta.valor_total,
      );

      if (
        !Number.isFinite(valor) ||
        valor <= 0
      ) {
        throw new Error(
          "O orçamento possui valor inválido.",
        );
      }

      const existentes =
        await tx.$queryRaw<PagamentoBanco[]>`
          SELECT
            id,
            txid,
            codigo_pix,
            valor::text,
            status
          FROM financeiro.pagamentos
          WHERE empresa_id = ${estado.empresaId}
            AND cliente_id = ${estado.clienteId}
            AND proposta_id = ${proposta.id}
            AND forma_pagamento = 'pix'
            AND status IN (
              'pendente',
              'processando',
              'pago'
            )
          ORDER BY id DESC
          LIMIT 1
          FOR UPDATE
        `;

      let pagamento =
        existentes[0] ?? null;

      if (!pagamento) {
        const txid = gerarTxid();
        const codigoPix =
          gerarCodigoPix(txid, valor);

        const criados =
          await tx.$queryRaw<PagamentoBanco[]>`
            INSERT INTO financeiro.pagamentos (
              empresa_id,
              cliente_id,
              proposta_id,
              forma_pagamento,
              valor,
              status,
              gateway,
              codigo_pix,
              txid,
              criado_em,
              atualizado_em
            )
            VALUES (
              ${estado.empresaId},
              ${estado.clienteId},
              ${proposta.id},
              'pix',
              ${valor},
              'pendente',
              'simulado',
              ${codigoPix},
              ${txid},
              NOW(),
              NOW()
            )
            RETURNING
              id,
              txid,
              codigo_pix,
              valor::text,
              status
          `;

        pagamento = criados[0] ?? null;
      }

      if (!pagamento) {
        throw new Error(
          "Não foi possível criar o pagamento.",
        );
      }

      let txid =
        pagamento.txid;

      if (!txid) {
        txid = gerarTxid();
      }

      let codigoPix =
        pagamento.codigo_pix;

      if (!codigoPix) {
        codigoPix = gerarCodigoPix(
          txid,
          Number(pagamento.valor),
        );

        const atualizados =
          await tx.$queryRaw<PagamentoBanco[]>`
            UPDATE financeiro.pagamentos
            SET
              txid = ${txid},
              codigo_pix = ${codigoPix},
              atualizado_em = NOW()
            WHERE id = ${pagamento.id}
            RETURNING
              id,
              txid,
              codigo_pix,
              valor::text,
              status
          `;

        pagamento =
          atualizados[0] ?? pagamento;
      }

      return {
        proposta,
        pagamento,
        txid,
        codigoPix,
        valor,
      };
    },
  );

  const resposta =
    "Pagamento PIX gerado.\n\n" +
    `Valor: ${moeda(resultado.valor)}\n` +
    `TXID: ${resultado.txid}\n` +
    `Código PIX: ${resultado.codigoPix}\n\n` +
    "Após o pagamento, aguarde a confirmação.";

  await atualizarEstadoConversa(
    estado.id,
    {
      etapa: "pagamento_pendente",
      ultimaMensagemCliente: mensagem,
      ultimaRespostaIa: resposta,
      contexto: {
        pagamentoId:
          resultado.pagamento.id.toString(),
        formaPagamento: "pix",
        ambientePagamento: "simulado",
        txid: resultado.txid,
        valorPagamento: resultado.valor,
      },
    },
  );

  return {
    sucesso: true,
    pagamentoId:
      resultado.pagamento.id,
    propostaId:
      resultado.proposta.id,
    txid: resultado.txid,
    codigoPix: resultado.codigoPix,
    valor: resultado.valor,
    status:
      resultado.pagamento.status,
    resposta,
  };
}
