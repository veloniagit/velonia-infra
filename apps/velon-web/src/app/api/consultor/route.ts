import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ProdutoBanco = {
  id: bigint;
  empresa_id: bigint;
  codigo_interno: string;
  codigo_fabricante: string | null;
  codigo_oem: string | null;
  descricao: string;
  preco: string;
  preco_promocional: string | null;
  estoque: string;
  unidade: string;
};

type ViaCepResposta = {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

type ConversaBanco = {
  id: bigint;
  cliente_id: bigint | null;
  etapa: string;
  ultimo_produto_id: bigint | null;
  ultima_proposta_id: bigint | null;
  quantidade: string;
};

const PALAVRAS_IGNORADAS = new Set([
  "a",
  "ao",
  "aos",
  "as",
  "com",
  "da",
  "das",
  "de",
  "do",
  "dos",
  "e",
  "eu",
  "me",
  "meu",
  "minha",
  "o",
  "os",
  "para",
  "por",
  "preciso",
  "quero",
  "tem",
  "uma",
  "um",
  "favor",
  "peca",
  "peça",
  "oem",
  "codigo",
  "código",
  "referencia",
  "referência",
  "original",
]);

function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extrairTermos(mensagem: string): string[] {
  return [
    ...new Set(
      normalizarTexto(mensagem)
        .split(" ")
        .filter((termo) => termo.length >= 2)
        .filter((termo) => !PALAVRAS_IGNORADAS.has(termo)),
    ),
  ].slice(0, 12);
}

function respostaAfirmativa(mensagem: string): boolean {
  const texto = normalizarTexto(mensagem);

  return [
    "sim",
    "pode",
    "pode gerar",
    "pode fazer",
    "gera",
    "gerar",
    "quero",
    "fechado",
    "ok",
    "confirmo",
    "manda",
  ].includes(texto);
}

function somenteNumeros(valor: string): string {
  return valor.replace(/\D/g, "");
}

function validarCpf(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  const calcularDigito = (base: string, pesoInicial: number): number => {
    let soma = 0;

    for (let i = 0; i < base.length; i += 1) {
      soma += Number(base[i]) * (pesoInicial - i);
    }

    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const primeiro = calcularDigito(cpf.slice(0, 9), 10);
  const segundo = calcularDigito(cpf.slice(0, 10), 11);

  return (
    primeiro === Number(cpf[9]) &&
    segundo === Number(cpf[10])
  );
}

function validarCnpj(cnpj: string): boolean {
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) {
    return false;
  }

  const calcularDigito = (
    base: string,
    pesos: number[],
  ): number => {
    const soma = base
      .split("")
      .reduce(
        (total, numero, indice) =>
          total + Number(numero) * pesos[indice],
        0,
      );

    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const primeiro = calcularDigito(
    cnpj.slice(0, 12),
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );

  const segundo = calcularDigito(
    cnpj.slice(0, 13),
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );

  return (
    primeiro === Number(cnpj[12]) &&
    segundo === Number(cnpj[13])
  );
}

function validarDocumento(documento: string): boolean {
  return validarCpf(documento) || validarCnpj(documento);
}

function identificarFormaPagamento(
  mensagem: string,
): "pix" | "cartao" | "boleto" | null {
  const texto = normalizarTexto(mensagem);

  if (
    texto === "pix" ||
    texto.includes("pagar no pix") ||
    texto.includes("pagamento pix")
  ) {
    return "pix";
  }

  if (
    texto === "cartao" ||
    texto.includes("cartao de credito") ||
    texto.includes("cartao de debito")
  ) {
    return "cartao";
  }

  if (
    texto === "boleto" ||
    texto.includes("pagar no boleto")
  ) {
    return "boleto";
  }

  return null;
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const mensagem =
      typeof body?.mensagem === "string"
        ? body.mensagem.trim()
        : "";

    const contato =
      typeof body?.contato === "string"
        ? body.contato.replace(/\D/g, "")
        : "";

    const empresaId =
      typeof body?.empresaId === "string" &&
      /^\d+$/.test(body.empresaId)
        ? BigInt(body.empresaId)
        : null;

    if (!mensagem) {
      return NextResponse.json(
        {
          status: "erro",
          mensagem: "Informe a mensagem do cliente.",
        },
        { status: 400 },
      );
    }

    if (!empresaId) {
      return NextResponse.json(
        {
          status: "erro",
          mensagem: "Informe uma empresaId válida.",
        },
        { status: 400 },
      );
    }

    if (!contato) {
      return NextResponse.json(
        {
          status: "erro",
          mensagem: "Informe o contato do cliente.",
        },
        { status: 400 },
      );
    }

    const prisma = getPrisma();

    const conversas = await prisma.$queryRaw<ConversaBanco[]>`
      SELECT
        id,
        cliente_id,
        etapa,
        ultimo_produto_id,
        ultima_proposta_id,
        quantidade::text
      FROM comercial.conversas_ia
      WHERE empresa_id = ${empresaId}
        AND canal = 'whatsapp'
        AND contato = ${contato}
      LIMIT 1
    `;

    const conversa = conversas[0];

    if (
      conversa &&
      conversa.etapa === "aguardando_pagamento"
    ) {
      const formaPagamento =
        identificarFormaPagamento(mensagem);

      if (!formaPagamento) {
        return NextResponse.json(
          {
            status: "erro",
            mensagem:
              "Escolha uma forma de pagamento válida: PIX, cartão ou boleto.",
            etapa: "aguardando_pagamento",
          },
          { status: 400 },
        );
      }

      if (formaPagamento !== "pix") {
        return NextResponse.json({
          status: "ok",
          formaPagamento,
          disponivel: false,
          etapa: "aguardando_pagamento",
          resposta:
            `A opção ${formaPagamento} será disponibilizada em breve. ` +
            `Para continuar agora, escolha PIX.`,
          proximaAcao: "escolher_pix",
        });
      }

      if (!conversa.cliente_id) {
        throw new Error(
          "A conversa não está vinculada a um cliente.",
        );
      }

      if (!conversa.ultima_proposta_id) {
        throw new Error(
          "A conversa não possui um orçamento vinculado.",
        );
      }

      const propostas = await prisma.$queryRaw<
        Array<{
          id: bigint;
          numero: string | null;
          valor_total: string;
          status: string;
        }>
      >`
        SELECT
          id,
          numero,
          valor_total::text,
          status
        FROM comercial.propostas
        WHERE id = ${conversa.ultima_proposta_id}
        LIMIT 1
      `;

      const proposta = propostas[0];

      if (!proposta) {
        throw new Error(
          "O orçamento vinculado não foi encontrado.",
        );
      }

      const valor = Number(proposta.valor_total);

      if (!Number.isFinite(valor) || valor <= 0) {
        throw new Error(
          "O valor do orçamento é inválido.",
        );
      }

      const resultado = await prisma.$transaction(
        async (tx) => {
          const pagamentosExistentes =
            await tx.$queryRaw<
              Array<{
                id: bigint;
                txid: string | null;
                codigo_pix: string | null;
                status: string;
              }>
            >`
              SELECT
                id,
                txid,
                codigo_pix,
                status
              FROM financeiro.pagamentos
              WHERE empresa_id = ${empresaId}
                AND cliente_id = ${conversa.cliente_id}
                AND proposta_id = ${proposta.id}
                AND forma_pagamento = 'pix'
                AND status IN ('pendente', 'processando')
              ORDER BY id DESC
              LIMIT 1
            `;

          let pagamento = pagamentosExistentes[0];

          if (!pagamento) {
            const identificador =
              `${Date.now()}-${Math.floor(
                Math.random() * 1000000,
              )
                .toString()
                .padStart(6, "0")}`;

            const txid =
              `VELON-${empresaId.toString()}-${identificador}`;

            const codigoPix =
              `PIX-SIMULADO|TXID:${txid}|VALOR:${valor.toFixed(
                2,
              )}`;

            const pagamentosCriados =
              await tx.$queryRaw<
                Array<{
                  id: bigint;
                  txid: string;
                  codigo_pix: string;
                  status: string;
                }>
              >`
                INSERT INTO financeiro.pagamentos (
                  empresa_id,
                  cliente_id,
                  proposta_id,
                  forma_pagamento,
                  valor,
                  status,
                  codigo_pix,
                  txid,
                  gateway,
                  criado_em,
                  atualizado_em
                )
                VALUES (
                  ${empresaId},
                  ${conversa.cliente_id},
                  ${proposta.id},
                  'pix',
                  ${valor},
                  'pendente',
                  ${codigoPix},
                  ${txid},
                  'simulado',
                  NOW(),
                  NOW()
                )
                RETURNING
                  id,
                  txid,
                  codigo_pix,
                  status
              `;

            pagamento = pagamentosCriados[0];
          } else if (!pagamento.codigo_pix) {
            const codigoPix =
              `PIX-SIMULADO|TXID:${
                pagamento.txid ?? pagamento.id.toString()
              }|VALOR:${valor.toFixed(2)}`;

            const pagamentosAtualizados =
              await tx.$queryRaw<
                Array<{
                  id: bigint;
                  txid: string | null;
                  codigo_pix: string;
                  status: string;
                }>
              >`
                UPDATE financeiro.pagamentos
                SET
                  codigo_pix = ${codigoPix},
                  atualizado_em = NOW()
                WHERE id = ${pagamento.id}::bigint
                RETURNING
                  id,
                  txid,
                  codigo_pix,
                  status
              `;

            pagamento = pagamentosAtualizados[0];
          }

          const resposta =
            `Cobrança PIX simulada criada para o orçamento ${
              proposta.numero ?? proposta.id.toString()
            }. Valor: ${formatarMoeda(valor)}. ` +
            `O pagamento está aguardando confirmação.`;

          await tx.$executeRaw`
            UPDATE comercial.conversas_ia
            SET
              etapa = 'pagamento_pendente',
              ultima_mensagem_cliente = ${mensagem},
              ultima_resposta_ia = ${resposta},
              contexto =
                COALESCE(contexto, '{}'::jsonb) ||
                ${JSON.stringify({
                  formaPagamento: "pix",
                  ambientePagamento: "simulado",
                })}::jsonb ||
                jsonb_build_object(
                  'pagamentoId',
                  ${pagamento.id.toString()}::text,
                  'txid',
                  ${pagamento.txid ?? ""}::text
                ),
              atualizado_em = NOW()
            WHERE id = ${conversa.id}
          `;

          return {
            pagamento,
            resposta,
          };
        },
      );

      return NextResponse.json({
        status: "ok",
        pagamentoCriado: true,
        ambiente: "simulado",
        formaPagamento: "pix",
        clienteId: conversa.cliente_id.toString(),
        propostaId: proposta.id.toString(),
        pagamento: {
          id: resultado.pagamento.id.toString(),
          txid: resultado.pagamento.txid,
          codigoPix: resultado.pagamento.codigo_pix,
          valor,
          status: resultado.pagamento.status,
          gateway: "simulado",
        },
        etapa: "pagamento_pendente",
        resposta: resultado.resposta,
        proximaAcao: "aguardar_pagamento",
      });
    }

    if (conversa && conversa.etapa === "aguardando_numero") {
      const textoNumero = mensagem.trim();

      if (textoNumero.length < 1 || textoNumero.length > 120) {
        return NextResponse.json(
          {
            status: "erro",
            mensagem:
              "Informe o número do imóvel. Você também pode incluir o complemento, por exemplo: 123, apartamento 42.",
            etapa: "aguardando_numero",
          },
          { status: 400 },
        );
      }

      if (!conversa.cliente_id) {
        throw new Error(
          "A conversa não está vinculada a um cliente.",
        );
      }

      const partes = textoNumero
        .split(/[,;-]/)
        .map((parte: string) => parte.trim())
        .filter((parte: string) => Boolean(parte));

      const numero = partes[0] ?? textoNumero;

      const complemento =
        partes.length > 1
          ? partes.slice(1).join(", ")
          : null;

      const resposta =
        "Endereço registrado com sucesso. Agora escolha a forma de pagamento: PIX, cartão ou boleto.";

      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`
          UPDATE crm.clientes
          SET
            numero = ${numero},
            complemento = ${complemento},
            atualizado_em = NOW()
          WHERE id = ${conversa.cliente_id}
            AND empresa_id = ${empresaId}
        `;

        await tx.$executeRaw`
          UPDATE comercial.conversas_ia
          SET
            etapa = 'aguardando_pagamento',
            ultima_mensagem_cliente = ${mensagem},
            ultima_resposta_ia = ${resposta},
            atualizado_em = NOW()
          WHERE id = ${conversa.id}
        `;
      });

      return NextResponse.json({
        status: "ok",
        enderecoCompleto: true,
        clienteId: conversa.cliente_id.toString(),
        numero,
        complemento,
        etapa: "aguardando_pagamento",
        resposta,
        proximaAcao: "coletar_pagamento",
      });
    }

    if (conversa && conversa.etapa === "aguardando_cep") {
      const cep = somenteNumeros(mensagem);

      if (!/^\d{8}$/.test(cep)) {
        return NextResponse.json(
          {
            status: "erro",
            mensagem:
              "Informe um CEP válido com 8 números. Exemplo: 82810350.",
            etapa: "aguardando_cep",
          },
          { status: 400 },
        );
      }

      if (!conversa.cliente_id) {
        throw new Error(
          "A conversa não está vinculada a um cliente.",
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
        console.error("Erro ao consultar ViaCEP:", error);

        return NextResponse.json(
          {
            status: "erro",
            mensagem:
              "Não foi possível consultar o CEP agora. Tente novamente em alguns instantes.",
            etapa: "aguardando_cep",
          },
          { status: 503 },
        );
      }

      if (enderecoCep.erro) {
        return NextResponse.json(
          {
            status: "erro",
            mensagem:
              "O CEP informado não foi encontrado. Confira os números e envie novamente.",
            etapa: "aguardando_cep",
          },
          { status: 400 },
        );
      }

      const logradouro =
        enderecoCep.logradouro?.trim() || null;

      const bairro =
        enderecoCep.bairro?.trim() || null;

      const cidade =
        enderecoCep.localidade?.trim() || null;

      const estado =
        enderecoCep.uf?.trim().toUpperCase() || null;

      const proximaEtapa = logradouro
        ? "aguardando_numero"
        : "aguardando_endereco";

      const resposta = logradouro
        ? `Localizei ${logradouro}${
            bairro ? `, ${bairro}` : ""
          }, ${cidade ?? ""}/${estado ?? ""}. Qual é o número do imóvel?`
        : `CEP localizado em ${cidade ?? "sua cidade"}/${
            estado ?? ""
          }. Agora informe o nome completo da rua ou avenida.`;

      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`
          UPDATE crm.clientes
          SET
            cep = ${cep},
            endereco = ${logradouro},
            bairro = ${bairro},
            cidade = ${cidade},
            estado = ${estado},
            atualizado_em = NOW()
          WHERE id = ${conversa.cliente_id}
            AND empresa_id = ${empresaId}
        `;

        await tx.$executeRaw`
          UPDATE comercial.conversas_ia
          SET
            etapa = ${proximaEtapa},
            ultima_mensagem_cliente = ${mensagem},
            ultima_resposta_ia = ${resposta},
            contexto =
              COALESCE(contexto, '{}'::jsonb) ||
              ${JSON.stringify({
                cep,
                origemEndereco: "viacep",
              })}::jsonb,
            atualizado_em = NOW()
          WHERE id = ${conversa.id}
        `;
      });

      return NextResponse.json({
        status: "ok",
        cepSalvo: true,
        clienteId: conversa.cliente_id.toString(),
        endereco: {
          cep,
          logradouro,
          bairro,
          cidade,
          estado,
        },
        etapa: proximaEtapa,
        resposta,
        proximaAcao: logradouro
          ? "coletar_numero"
          : "coletar_endereco",
      });
    }

    if (conversa && conversa.etapa === "aguardando_documento") {
      const documento = somenteNumeros(mensagem);

      if (!validarDocumento(documento)) {
        return NextResponse.json(
          {
            status: "erro",
            mensagem:
              "Informe um CPF ou CNPJ válido, contendo apenas números ou pontuação.",
            etapa: "aguardando_documento",
          },
          { status: 400 },
        );
      }

      if (!conversa.cliente_id) {
        throw new Error(
          "A conversa não está vinculada a um cliente.",
        );
      }

      const resposta =
        "Documento registrado com sucesso. Agora informe seu CEP.";

      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`
          UPDATE crm.clientes
          SET
            cpf_cnpj = ${documento},
            atualizado_em = NOW()
          WHERE id = ${conversa.cliente_id}
            AND empresa_id = ${empresaId}
        `;

        await tx.$executeRaw`
          UPDATE comercial.conversas_ia
          SET
            etapa = 'aguardando_cep',
            ultima_mensagem_cliente = ${mensagem},
            ultima_resposta_ia = ${resposta},
            atualizado_em = NOW()
          WHERE id = ${conversa.id}
        `;
      });

      return NextResponse.json({
        status: "ok",
        documentoSalvo: true,
        clienteId: conversa.cliente_id.toString(),
        tipoDocumento:
          documento.length === 11 ? "CPF" : "CNPJ",
        documento,
        etapa: "aguardando_cep",
        resposta,
        proximaAcao: "coletar_cep",
      });
    }

    if (conversa && conversa.etapa === "aguardando_nome") {
      const nome = mensagem.trim();

      if (nome.length < 3) {
        return NextResponse.json(
          {
            status: "erro",
            mensagem:
              "Informe seu nome completo para continuarmos.",
          },
          { status: 400 },
        );
      }

      const clientes = await prisma.$queryRaw<
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
          ${empresaId},
          ${nome},
          ${contato},
          'ativo',
          NOW(),
          NOW()
        )
        ON CONFLICT DO NOTHING
        RETURNING id
      `;

      let clienteId = clientes[0]?.id ?? null;

      if (!clienteId) {
        const existentes = await prisma.$queryRaw<
          Array<{ id: bigint }>
        >`
          SELECT id
          FROM crm.clientes
          WHERE empresa_id = ${empresaId}
            AND whatsapp = ${contato}
          ORDER BY id DESC
          LIMIT 1
        `;

        clienteId = existentes[0]?.id ?? null;
      }

      if (!clienteId) {
        throw new Error(
          "Não foi possível criar ou localizar o cliente.",
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`
          UPDATE comercial.conversas_ia
          SET
            cliente_id = ${clienteId},
            nome_contato = ${nome},
            etapa = 'aguardando_documento',
            ultima_mensagem_cliente = ${mensagem},
            ultima_resposta_ia =
              'Obrigado. Agora informe seu CPF ou CNPJ.',
            atualizado_em = NOW()
          WHERE id = ${conversa.id}
        `;

        if (conversa.ultima_proposta_id) {
          await tx.$executeRaw`
            UPDATE comercial.propostas
            SET
              cliente_id = ${clienteId},
              atualizado_em = NOW()
            WHERE id = ${conversa.ultima_proposta_id}
          `;
        }
      });

      return NextResponse.json({
        status: "ok",
        clienteCriado: true,
        clienteId: clienteId.toString(),
        nome,
        etapa: "aguardando_documento",
        resposta:
          `Obrigado, ${nome}. Agora informe seu CPF ou CNPJ.`,
        proximaAcao: "coletar_documento",
      });
    }

    if (
      conversa &&
      conversa.etapa === "oferecendo_orcamento" &&
      conversa.ultimo_produto_id &&
      respostaAfirmativa(mensagem)
    ) {
      const resultado = await prisma.$transaction(async (tx) => {
        const produtos = await tx.$queryRaw<
          Array<{
            id: bigint;
            codigo_interno: string;
            descricao: string;
            preco_venda: string;
            estoque: string;
          }>
        >`
          SELECT
            id,
            codigo_interno,
            descricao,
            COALESCE(preco_promocional, preco)::text AS preco_venda,
            estoque::text
          FROM catalogo.produtos
          WHERE id = ${conversa.ultimo_produto_id}
            AND empresa_id = ${empresaId}
            AND status = 'ativo'
          LIMIT 1
        `;

        const produto = produtos[0];

        if (!produto) {
          throw new Error(
            "O produto salvo na conversa não está mais disponível.",
          );
        }

        const quantidade = Number(conversa.quantidade);
        const precoVenda = Number(produto.preco_venda);
        const estoque = Number(produto.estoque);

        if (
          !Number.isFinite(quantidade) ||
          quantidade <= 0
        ) {
          throw new Error(
            "A quantidade salva na conversa é inválida.",
          );
        }

        if (estoque < quantidade) {
          throw new Error(
            `Estoque insuficiente. Disponível: ${estoque}.`,
          );
        }

        const valorTotal =
          Math.round(
            quantidade * precoVenda * 100,
          ) / 100;

        const propostas = await tx.$queryRaw<
          Array<{ id: bigint }>
        >`
          INSERT INTO comercial.propostas (
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
            ${`Orçamento ${produto.descricao}`},
            ${`Orçamento automático criado pelo Consultor VelON para o contato ${contato}.`},
            0,
            ${valorTotal},
            CURRENT_DATE + 7,
            'rascunho',
            NOW(),
            NOW()
          )
          RETURNING id
        `;

        const propostaId = propostas[0].id;

        const numero =
          `ORC-${propostaId
            .toString()
            .padStart(6, "0")}`;

        await tx.$executeRaw`
          UPDATE comercial.propostas
          SET
            numero = ${numero},
            atualizado_em = NOW()
          WHERE id = ${propostaId}
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
            ${propostaId},
            ${produto.id},
            ${produto.codigo_interno},
            ${produto.descricao},
            ${quantidade},
            ${precoVenda},
            0,
            ${valorTotal},
            'Item incluído automaticamente pelo Consultor VelON.',
            NOW(),
            NOW()
          )
        `;

        const resposta =
          `Perfeito! Seu orçamento ${numero} foi criado com sucesso. ` +
          `Total: ${formatarMoeda(valorTotal)}. ` +
          `Validade: 7 dias. ` +
          `Agora, para continuar, qual é o seu nome completo?`;

        await tx.$executeRaw`
          UPDATE comercial.conversas_ia
          SET
            etapa = 'aguardando_nome',
            ultima_proposta_id = ${propostaId},
            ultima_mensagem_cliente = ${mensagem},
            ultima_resposta_ia = ${resposta},
            atualizado_em = NOW()
          WHERE id = ${conversa.id}
        `;

        return {
          propostaId,
          numero,
          quantidade,
          precoVenda,
          valorTotal,
          produto,
          resposta,
        };
      });

      return NextResponse.json({
        status: "ok",
        memoriaEncontrada: true,
        orcamentoCriado: true,
        acao: "aguardando_nome",
        empresaId: empresaId.toString(),
        contato,
        orcamento: {
          id: resultado.propostaId.toString(),
          numero: resultado.numero,
          produtoId: resultado.produto.id.toString(),
          codigoProduto:
            resultado.produto.codigo_interno,
          descricao:
            resultado.produto.descricao,
          quantidade: resultado.quantidade,
          valorUnitario: resultado.precoVenda,
          valorTotal: resultado.valorTotal,
          status: "rascunho",
          validadeDias: 7,
          url:
            `/orcamentos/${resultado.propostaId.toString()}`,
        },
        resposta: resultado.resposta,
        proximaAcao: "coletar_nome",
      });
    }

    const termos = extrairTermos(mensagem);

    if (termos.length === 0) {
      return NextResponse.json({
        status: "ok",
        produtoEncontrado: false,
        mensagemRecebida: mensagem,
        termosIdentificados: [],
        resposta:
          "Não consegui identificar a peça. Informe a peça, veículo, motor, ano ou código.",
        produtos: [],
      });
    }

    const produtos = await prisma.$queryRaw<ProdutoBanco[]>`
      SELECT
        p.id,
        p.empresa_id,
        p.codigo_interno,
        p.codigo_fabricante,
        p.codigo_oem,
        p.descricao,
        p.preco::text,
        p.preco_promocional::text,
        p.estoque::text,
        p.unidade
      FROM catalogo.produtos AS p
      LEFT JOIN catalogo.categorias AS c
        ON c.id = p.categoria_id
      LEFT JOIN catalogo.marcas AS m
        ON m.id = p.marca_id
      LEFT JOIN catalogo.produto_aplicacoes AS pa
        ON pa.produto_id = p.id
      LEFT JOIN catalogo.veiculos AS v
        ON v.id = pa.veiculo_id
      WHERE
        p.status = 'ativo'
        AND p.empresa_id = ${empresaId}
        AND CONCAT_WS(
          ' ',
          p.codigo_interno,
          p.codigo_fabricante,
          p.codigo_oem,
          p.ean,
          p.descricao,
          p.descricao_completa,
          p.fabricante,
          p.subcategoria,
          c.nome,
          m.nome,
          v.montadora,
          v.modelo,
          v.versao,
          v.motor,
          v.combustivel,
          v.ano_inicial::text,
          v.ano_final::text
        ) ILIKE ALL (
          SELECT '%' || termo || '%'
          FROM UNNEST(${termos}::text[]) AS termo
        )
      ORDER BY
        CASE WHEN p.estoque > 0 THEN 0 ELSE 1 END,
        p.estoque DESC,
        COALESCE(p.preco_promocional, p.preco) ASC,
        p.id DESC
      LIMIT 1
    `;

    const produto = produtos[0];

    if (!produto) {
      const resposta =
        "Não encontrei um produto compatível. Confirme a peça, o veículo, o motor e o ano.";

      await prisma.$executeRaw`
        INSERT INTO comercial.conversas_ia (
          empresa_id,
          canal,
          contato,
          etapa,
          ultimo_produto_id,
          ultima_mensagem_cliente,
          ultima_resposta_ia,
          atualizado_em
        )
        VALUES (
          ${empresaId},
          'whatsapp',
          ${contato},
          'inicio',
          NULL,
          ${mensagem},
          ${resposta},
          NOW()
        )
        ON CONFLICT (empresa_id, canal, contato)
        DO UPDATE SET
          etapa = 'inicio',
          ultimo_produto_id = NULL,
          ultima_mensagem_cliente =
            EXCLUDED.ultima_mensagem_cliente,
          ultima_resposta_ia =
            EXCLUDED.ultima_resposta_ia,
          atualizado_em = NOW()
      `;

      return NextResponse.json({
        status: "ok",
        produtoEncontrado: false,
        mensagemRecebida: mensagem,
        termosIdentificados: termos,
        resposta,
        produtos: [],
      });
    }

    const preco = Number(produto.preco);

    const precoPromocional =
      produto.preco_promocional === null
        ? null
        : Number(produto.preco_promocional);

    const precoVenda = precoPromocional ?? preco;
    const estoque = Number(produto.estoque);

    const resposta =
      estoque > 0
        ? `Encontrei ${produto.descricao} por ${formatarMoeda(
            precoVenda,
          )}. Temos ${estoque} ${
            produto.unidade
          } em estoque. Deseja que eu gere um orçamento?`
        : `Encontrei ${produto.descricao}, mas o produto está sem estoque. Posso procurar uma alternativa?`;

    await prisma.$executeRaw`
      INSERT INTO comercial.conversas_ia (
        empresa_id,
        canal,
        contato,
        etapa,
        ultimo_produto_id,
        quantidade,
        ultima_mensagem_cliente,
        ultima_resposta_ia,
        contexto,
        atualizado_em
      )
      VALUES (
        ${empresaId},
        'whatsapp',
        ${contato},
        'oferecendo_orcamento',
        ${produto.id},
        1,
        ${mensagem},
        ${resposta},
        ${JSON.stringify({
          termos,
          codigoInterno: produto.codigo_interno,
        })}::jsonb,
        NOW()
      )
      ON CONFLICT (empresa_id, canal, contato)
      DO UPDATE SET
        etapa = 'oferecendo_orcamento',
        ultimo_produto_id = EXCLUDED.ultimo_produto_id,
        quantidade = 1,
        ultima_mensagem_cliente =
          EXCLUDED.ultima_mensagem_cliente,
        ultima_resposta_ia =
          EXCLUDED.ultima_resposta_ia,
        contexto = EXCLUDED.contexto,
        atualizado_em = NOW()
    `;

    return NextResponse.json({
      status: "ok",
      produtoEncontrado: true,
      memoriaSalva: true,
      mensagemRecebida: mensagem,
      termosIdentificados: termos,
      produto: {
        id: produto.id.toString(),
        codigoInterno: produto.codigo_interno,
        codigoFabricante: produto.codigo_fabricante,
        codigoOem: produto.codigo_oem,
        descricao: produto.descricao,
        preco,
        precoPromocional,
        precoVenda,
        estoque,
        unidade: produto.unidade,
      },
      resposta,
      proximaAcao: "oferecer_orcamento",
    });
  } catch (error) {
    console.error("Erro no consultor com memória:", error);

    return NextResponse.json(
      {
        status: "erro",
        mensagem: "Não foi possível processar a conversa.",
      },
      { status: 500 },
    );
  }
}
