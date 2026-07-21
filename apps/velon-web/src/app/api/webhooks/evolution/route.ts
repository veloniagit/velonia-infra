import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { processarMensagem } from "@/lib/conversation";

import {
  evolutionFetch,
  evolutionInstance,
} from "@/lib/evolution";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ObjetoGenerico = Record<string, unknown>;

type RespostaConsultor = {
  status?: string;
  resposta?: string;
  mensagem?: string;
  [chave: string]: unknown;
};

type RespostaEnvioEvolution = {
  key?: {
    id?: string;
  };
  [chave: string]: unknown;
};

function objeto(valor: unknown): ObjetoGenerico {
  if (
    typeof valor === "object" &&
    valor !== null &&
    !Array.isArray(valor)
  ) {
    return valor as ObjetoGenerico;
  }

  return {};
}

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim()
    ? valor.trim()
    : null;
}

function extrairMensagem(payload: ObjetoGenerico) {
  const data = objeto(payload.data);
  const key = objeto(data.key);
  const message = objeto(data.message);

  const extendedTextMessage = objeto(
    message.extendedTextMessage,
  );

  const imageMessage = objeto(
    message.imageMessage,
  );

  const videoMessage = objeto(
    message.videoMessage,
  );

  const documentMessage = objeto(
    message.documentMessage,
  );

  const remoteJid =
    texto(key.remoteJid) ??
    texto(data.remoteJid);

  const destinatarioWhatsapp =
    remoteJid ?? null;

  const contato =
    remoteJid
      ?.replace("@s.whatsapp.net", "")
      .replace("@lid", "") ?? null;

  const mensagemId =
    texto(key.id) ??
    texto(data.id);

  const deMim =
    key.fromMe === true ||
    data.fromMe === true;

  const mensagemTexto =
    texto(message.conversation) ??
    texto(extendedTextMessage.text) ??
    texto(imageMessage.caption) ??
    texto(videoMessage.caption) ??
    texto(documentMessage.caption) ??
    null;

  return {
    contato,
    destinatarioWhatsapp,
    mensagemId,
    deMim,
    mensagemTexto,
  };
}

async function chamarNovoMotor(
  contato: string,
  mensagem: string,
): Promise<{
  resposta: string;
  intencao: string;
  etapaAnterior: string;
  proximaEtapa: string | null;
}> {
  console.log("=== INICIANDO PROCESSAMENTO DO CONVERSATION ENGINE ===");

  const resultado = await processarMensagem({
    empresaId: BigInt(1),
    contato,
    mensagem,
  });

  console.log("=== RESULTADO DO CONVERSATION ENGINE ===");
  console.dir(resultado, { depth: null });

  if (!resultado.resposta?.trim()) {
    throw new Error(
      "O novo motor não retornou uma resposta.",
    );
  }

  return {
    resposta: resultado.resposta,
    intencao: resultado.intencao,
    etapaAnterior: resultado.etapaAnterior,
    proximaEtapa: resultado.proximaEtapa,
  };
}

async function chamarConsultor(
  _request: Request,
  contato: string,
  mensagem: string,
): Promise<RespostaConsultor> {
  const velonInternalUrl =
    process.env.VELON_INTERNAL_URL ||
    "http://127.0.0.1:3000";

  const resposta = await fetch(
    `${velonInternalUrl}/api/consultor`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        empresaId: "1",
        contato,
        mensagem,
      }),
      cache: "no-store",
    },
  );

  const dados =
    (await resposta.json()) as RespostaConsultor;

  if (!resposta.ok) {
    throw new Error(
      dados.mensagem ??
        `Consultor respondeu HTTP ${resposta.status}.`,
    );
  }

  return dados;
}

async function enviarMensagemWhatsapp(
  destinatario: string,
  mensagem: string,
): Promise<RespostaEnvioEvolution> {
  return evolutionFetch<RespostaEnvioEvolution>(
    `/message/sendText/${encodeURIComponent(
      evolutionInstance,
    )}`,
    {
      method: "POST",
      body: JSON.stringify({
        number: destinatario,
        text: mensagem,
      }),
    },
  );
}

export async function POST(request: Request) {
  let eventoId: bigint | null = null;

  try {
    const url = new URL(request.url);

    const tokenRecebido =
      url.searchParams.get("token");

    const tokenConfigurado =
      process.env.EVOLUTION_WEBHOOK_TOKEN;

    if (
      !tokenConfigurado ||
      tokenRecebido !== tokenConfigurado
    ) {
      return NextResponse.json(
        {
          status: "erro",
          mensagem: "Webhook não autorizado.",
        },
        { status: 401 },
      );
    }

    let payload: ObjetoGenerico;

    try {
      payload = objeto(await request.json());
    } catch {
      return NextResponse.json(
        {
          status: "erro",
          mensagem: "Payload JSON inválido.",
        },
        { status: 400 },
      );
    }

    const evento =
      texto(payload.event) ??
      texto(payload.type) ??
      "evento_desconhecido";

    const instancia =
      texto(payload.instance) ??
      texto(objeto(payload.data).instance) ??
      process.env.EVOLUTION_INSTANCE ??
      "velonia";

    const {
      contato,
      destinatarioWhatsapp,
      mensagemId,
      deMim,
      mensagemTexto,
    } = extrairMensagem(payload);

    const prisma = getPrisma();

    let duplicado = false;

    try {
      const inseridos = await prisma.$queryRaw<
        Array<{ id: bigint }>
      >`
        INSERT INTO comercial.eventos_whatsapp (
          empresa_id,
          instancia,
          evento,
          mensagem_id,
          contato,
          de_mim,
          texto,
          payload,
          processado,
          recebido_em
        )
        VALUES (
          1,
          ${instancia},
          ${evento},
          ${mensagemId},
          ${contato},
          ${deMim},
          ${mensagemTexto},
          ${JSON.stringify(payload)}::jsonb,
          FALSE,
          NOW()
        )
        RETURNING id
      `;

      eventoId = inseridos[0]?.id ?? null;
    } catch (error) {
      const mensagemErro =
        error instanceof Error
          ? error.message
          : "";

      if (
        mensagemErro.includes(
          "eventos_whatsapp_mensagem_unique",
        ) ||
        mensagemErro.includes(
          "Unique constraint failed",
        )
      ) {
        duplicado = true;
      } else {
        throw error;
      }
    }

    console.log("Webhook Evolution recebido:", {
      evento,
      instancia,
      mensagemId,
      contato,
      deMim,
      possuiTexto: Boolean(mensagemTexto),
      duplicado,
    });

    if (duplicado) {
      return NextResponse.json({
        status: "ok",
        recebido: true,
        duplicado: true,
        processado: false,
      });
    }

    const eventoNormalizado = evento
      .trim()
      .toUpperCase()
      .replace(/[.-]/g, "_");

    if (eventoNormalizado !== "MESSAGES_UPSERT") {
      if (eventoId) {
        await prisma.$executeRaw`
          UPDATE comercial.eventos_whatsapp
          SET
            processado = TRUE,
            processado_em = NOW()
          WHERE id = ${eventoId}
        `;
      }

      return NextResponse.json({
        status: "ok",
        recebido: true,
        ignorado: true,
        motivo: "Evento sem processamento comercial.",
      });
    }

    if (deMim) {
      if (eventoId) {
        await prisma.$executeRaw`
          UPDATE comercial.eventos_whatsapp
          SET
            processado = TRUE,
            processado_em = NOW()
          WHERE id = ${eventoId}
        `;
      }

      return NextResponse.json({
        status: "ok",
        recebido: true,
        ignorado: true,
        motivo: "Mensagem enviada pela própria instância.",
      });
    }

    if (!contato || !mensagemTexto) {
      if (eventoId) {
        await prisma.$executeRaw`
          UPDATE comercial.eventos_whatsapp
          SET
            processado = TRUE,
            erro = 'Mensagem sem contato ou texto compatível.',
            processado_em = NOW()
          WHERE id = ${eventoId}
        `;
      }

      return NextResponse.json({
        status: "ok",
        recebido: true,
        ignorado: true,
        motivo: "Mensagem sem texto processável.",
      });
    }

    const novoMotorAtivo =
      process.env.CONVERSATION_ENGINE_ENABLED !==
      "false";

    let respostaConsultor: string | null = null;
    let motorUtilizado:
      | "conversation_engine"
      | "consultor_fallback" =
      "consultor_fallback";

    let dadosNovoMotor: {
      intencao: string;
      etapaAnterior: string;
      proximaEtapa: string | null;
    } | null = null;

    if (novoMotorAtivo) {
      try {
        const resultadoNovoMotor =
          await chamarNovoMotor(
            contato,
            mensagemTexto,
          );

        respostaConsultor =
          resultadoNovoMotor.resposta;

        dadosNovoMotor = {
          intencao:
            resultadoNovoMotor.intencao,
          etapaAnterior:
            resultadoNovoMotor.etapaAnterior,
          proximaEtapa:
            resultadoNovoMotor.proximaEtapa,
        };

        motorUtilizado =
          "conversation_engine";
      } catch (erroNovoMotor) {
        console.error(
          "Novo motor falhou; usando Consultor como fallback:",
          erroNovoMotor,
        );
      }
    }

    if (!respostaConsultor) {
      const resultadoConsultor =
        await chamarConsultor(
          request,
          contato,
          mensagemTexto,
        );

      respostaConsultor =
        texto(resultadoConsultor.resposta) ??
        texto(resultadoConsultor.mensagem);

      motorUtilizado =
        "consultor_fallback";
    }

    if (!respostaConsultor) {
      throw new Error(
        "Nenhum motor retornou uma resposta para o cliente.",
      );
    }

    const envio = await enviarMensagemWhatsapp(
      destinatarioWhatsapp ?? contato,
      respostaConsultor,
    );

    if (eventoId) {
      await prisma.$executeRaw`
        UPDATE comercial.eventos_whatsapp
        SET
          processado = TRUE,
          erro = NULL,
          processado_em = NOW()
        WHERE id = ${eventoId}
      `;
    }

    console.log("Resposta automática enviada:", {
      eventoId: eventoId?.toString() ?? null,
      contato,
      mensagemRecebida: mensagemTexto,
      resposta: respostaConsultor,
      motorUtilizado,
      dadosNovoMotor,
      envioId: envio.key?.id ?? null,
    });

    return NextResponse.json({
      status: "ok",
      recebido: true,
      duplicado: false,
      processado: true,
      eventoId:
        eventoId?.toString() ?? null,
      contato,
      mensagemRecebida: mensagemTexto,
      respostaEnviada: respostaConsultor,
      motorUtilizado,
      dadosNovoMotor,
      envioId: envio.key?.id ?? null,
    });
  } catch (error) {
    const detalhe =
      error instanceof Error
        ? error.message
        : "Erro desconhecido.";

    console.error(
      "Erro no processamento automático do WhatsApp:",
      error,
    );

    if (eventoId) {
      try {
        const prisma = getPrisma();

        await prisma.$executeRaw`
          UPDATE comercial.eventos_whatsapp
          SET
            processado = FALSE,
            erro = ${detalhe},
            processado_em = NOW()
          WHERE id = ${eventoId}
        `;
      } catch (erroBanco) {
        console.error(
          "Erro ao registrar falha do webhook:",
          erroBanco,
        );
      }
    }

    return NextResponse.json(
      {
        status: "erro",
        mensagem:
          "Não foi possível processar e responder a mensagem.",
        detalhe,
      },
      { status: 500 },
    );
  }
}
