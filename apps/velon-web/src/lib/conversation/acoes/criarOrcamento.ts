import { getPrisma } from "@/lib/prisma";

import {
  atualizarEstadoConversa,
  type EstadoConversa,
} from "@/lib/conversation/estado";

type ProdutoOrcamentoBanco = {
  id: bigint;
  codigo_interno: string;
  descricao: string;
  preco_venda: string;
  estoque: string;
  unidade: string;
  permite_venda_sem_estoque: boolean;
};

export type ResultadoCriarOrcamento = {
  sucesso: boolean;
  propostaId: bigint;
  numero: string;
  resposta: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
};

function moeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

export async function executarCriarOrcamento(
  estado: EstadoConversa,
  mensagem: string,
): Promise<ResultadoCriarOrcamento> {
  if (!estado.ultimoProdutoId) {
    throw new Error(
      "Nenhum produto foi selecionado.",
    );
  }

  const quantidade = Number(estado.quantidade);

  if (
    !Number.isFinite(quantidade) ||
    quantidade <= 0
  ) {
    throw new Error(
      "A quantidade da conversa é inválida.",
    );
  }

  const prisma = getPrisma();

  const resultado = await prisma.$transaction(
    async (tx) => {
      const produtos =
        await tx.$queryRaw<ProdutoOrcamentoBanco[]>`
          SELECT
            id,
            codigo_interno,
            descricao,
            COALESCE(
              NULLIF(preco_promocional, 0),
              preco
            )::text AS preco_venda,
            estoque::text,
            unidade,
            permite_venda_sem_estoque
          FROM catalogo.produtos
          WHERE id = ${estado.ultimoProdutoId}
            AND empresa_id = ${estado.empresaId}
            AND status = 'ativo'
          LIMIT 1
        `;

      const produto = produtos[0];

      if (!produto) {
        throw new Error(
          "O produto não está mais disponível.",
        );
      }

      const estoque = Number(produto.estoque);
      const valorUnitario =
        Number(produto.preco_venda);

      if (
        !produto.permite_venda_sem_estoque &&
        estoque < quantidade
      ) {
        throw new Error(
          `Estoque insuficiente. Disponível: ${estoque}.`,
        );
      }

      const valorTotal =
        Math.round(
          quantidade * valorUnitario * 100,
        ) / 100;

      const propostas =
        await tx.$queryRaw<Array<{ id: bigint }>>`
          INSERT INTO comercial.propostas (
            cliente_id,
            titulo,
            descricao,
            desconto,
            valor_total,
            validade,
            status,
            criado_em,
            atualizado_em
          )
          VALUES (
            ${estado.clienteId},
            ${`Orçamento ${produto.descricao}`},
            ${`Orçamento automático para o contato ${estado.contato}.`},
            0,
            ${valorTotal},
            CURRENT_DATE + 7,
            'rascunho',
            NOW(),
            NOW()
          )
          RETURNING id
        `;

      const proposta = propostas[0];

      if (!proposta) {
        throw new Error(
          "Não foi possível criar o orçamento.",
        );
      }

      const numero =
        `ORC-${proposta.id
          .toString()
          .padStart(6, "0")}`;

      await tx.$executeRaw`
        UPDATE comercial.propostas
        SET
          numero = ${numero},
          atualizado_em = NOW()
        WHERE id = ${proposta.id}
      `;

      await tx.$executeRaw`
        INSERT INTO comercial.proposta_itens (
          proposta_id,
          produto_id,
          codigo_produto,
          descricao,
          quantidade,
          valor_unitario,
          desconto,
          valor_total,
          observacoes,
          criado_em,
          atualizado_em
        )
        VALUES (
          ${proposta.id},
          ${produto.id},
          ${produto.codigo_interno},
          ${produto.descricao},
          ${quantidade},
          ${valorUnitario},
          0,
          ${valorTotal},
          'Item incluído pelo Motor Conversacional VelON.',
          NOW(),
          NOW()
        )
      `;

      return {
        propostaId: proposta.id,
        numero,
        produto,
        valorUnitario,
        valorTotal,
      };
    },
  );

  const resposta =
    `Orçamento ${resultado.numero} criado com sucesso. ` +
    `Total: ${moeda(resultado.valorTotal)}. ` +
    "Validade: 7 dias. Agora informe seu nome completo.";

  await atualizarEstadoConversa(
    estado.id,
    {
      etapa: "aguardando_nome",
      ultimaPropostaId:
        resultado.propostaId,
      ultimaMensagemCliente: mensagem,
      ultimaRespostaIa: resposta,
      contexto: {
        orcamento: {
          id: resultado.propostaId.toString(),
          numero: resultado.numero,
          quantidade,
          valorUnitario:
            resultado.valorUnitario,
          valorTotal:
            resultado.valorTotal,
          validadeDias: 7,
        },
      },
    },
  );

  return {
    sucesso: true,
    propostaId: resultado.propostaId,
    numero: resultado.numero,
    resposta,
    quantidade,
    valorUnitario:
      resultado.valorUnitario,
    valorTotal: resultado.valorTotal,
  };
}
