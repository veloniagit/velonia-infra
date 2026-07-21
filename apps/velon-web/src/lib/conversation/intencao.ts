import type {
  EstadoConversa,
  EtapaConversa,
} from "@/lib/conversation/estado";

export type IntencaoConversa =
  | "saudacao"
  | "buscar_produto"
  | "confirmar"
  | "negar"
  | "informar_quantidade"
  | "informar_nome"
  | "informar_documento"
  | "informar_cep"
  | "informar_numero"
  | "escolher_pagamento"
  | "consultar_pedido"
  | "consultar_rastreio"
  | "cancelar"
  | "atendimento_humano"
  | "reiniciar"
  | "mensagem_generica";

export type ResultadoIntencao = {
  intencao: IntencaoConversa;
  confianca: number;
  dados: Record<string, unknown>;
};

function normalizarTexto(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function somenteNumeros(valor: string): string {
  return valor.replace(/\D/g, "");
}

function contemAlgum(
  texto: string,
  termos: string[],
): boolean {
  return termos.some((termo) =>
    texto.includes(termo),
  );
}

function pareceDocumento(texto: string): boolean {
  const numeros = somenteNumeros(texto);

  return (
    numeros.length === 11 ||
    numeros.length === 14
  );
}

function pareceCep(texto: string): boolean {
  return somenteNumeros(texto).length === 8;
}

function pareceNumeroEndereco(
  texto: string,
): boolean {
  return /^\d+[a-zA-Z]?(?:\s*[-,/]\s*.+)?$/.test(
    texto.trim(),
  );
}

function pareceNome(texto: string): boolean {
  const partes = texto
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return (
    partes.length >= 2 &&
    partes.every((parte) =>
      /^[A-Za-zÀ-ÿ'-]+$/.test(parte),
    )
  );
}

function intencaoPorEtapa(
  etapa: EtapaConversa,
  mensagem: string,
): ResultadoIntencao | null {
  switch (etapa) {
    case "aguardando_quantidade": {
      const quantidadeTexto = mensagem
        .replace(",", ".")
        .match(/\d+(?:\.\d+)?/);

      const quantidade = quantidadeTexto
        ? Number(quantidadeTexto[0])
        : NaN;

      if (
        Number.isFinite(quantidade) &&
        quantidade > 0 &&
        quantidade <= 9999
      ) {
        return {
          intencao: "informar_quantidade",
          confianca: 0.99,
          dados: {
            quantidade,
          },
        };
      }

      return null;
    }

    case "aguardando_nome":
      if (pareceNome(mensagem)) {
        return {
          intencao: "informar_nome",
          confianca: 0.98,
          dados: {
            nome: mensagem.trim(),
          },
        };
      }

      return null;

    case "aguardando_documento":
      if (pareceDocumento(mensagem)) {
        return {
          intencao: "informar_documento",
          confianca: 0.99,
          dados: {
            documento:
              somenteNumeros(mensagem),
          },
        };
      }

      return null;

    case "aguardando_cep":
      if (pareceCep(mensagem)) {
        return {
          intencao: "informar_cep",
          confianca: 0.99,
          dados: {
            cep: somenteNumeros(mensagem),
          },
        };
      }

      return null;

    case "aguardando_numero":
      if (pareceNumeroEndereco(mensagem)) {
        return {
          intencao: "informar_numero",
          confianca: 0.97,
          dados: {
            numeroEndereco:
              mensagem.trim(),
          },
        };
      }

      return null;

    case "aguardando_pagamento": {
      const texto = normalizarTexto(mensagem);

      if (
        contemAlgum(texto, [
          "pix",
          "cartao",
          "cartão",
          "boleto",
        ])
      ) {
        const formaPagamento =
          texto.includes("pix")
            ? "pix"
            : texto.includes("boleto")
              ? "boleto"
              : "cartao";

        return {
          intencao: "escolher_pagamento",
          confianca: 0.99,
          dados: {
            formaPagamento,
          },
        };
      }

      return null;
    }

    case "oferecendo_orcamento":
    case "aguardando_confirmacao": {
      const texto = normalizarTexto(mensagem);

      if (
        contemAlgum(texto, [
          "sim",
          "quero",
          "pode",
          "ok",
          "confirmo",
          "gerar",
        ])
      ) {
        return {
          intencao: "confirmar",
          confianca: 0.98,
          dados: {},
        };
      }

      if (
        contemAlgum(texto, [
          "nao",
          "não",
          "cancelar",
          "desistir",
        ])
      ) {
        return {
          intencao: "negar",
          confianca: 0.95,
          dados: {},
        };
      }

      return null;
    }

    default:
      return null;
  }
}

export function identificarIntencao(
  mensagem: string,
  estado?: EstadoConversa | null,
): ResultadoIntencao {
  const textoOriginal = mensagem.trim();
  const texto = normalizarTexto(textoOriginal);

  const porEtapa = estado
    ? intencaoPorEtapa(
        estado.etapa,
        textoOriginal,
      )
    : null;

  if (porEtapa) {
    return porEtapa;
  }

  if (
    contemAlgum(texto, [
      "quero falar com atendente",
      "atendente humano",
      "falar com humano",
      "suporte humano",
      "pessoa de verdade",
    ])
  ) {
    return {
      intencao: "atendimento_humano",
      confianca: 0.99,
      dados: {},
    };
  }

  if (
    contemAlgum(texto, [
      "reiniciar",
      "comecar de novo",
      "começar de novo",
      "nova compra",
      "novo atendimento",
    ])
  ) {
    return {
      intencao: "reiniciar",
      confianca: 0.98,
      dados: {},
    };
  }

  if (
    contemAlgum(texto, [
      "cancelar",
      "desistir",
      "nao quero mais",
      "não quero mais",
    ])
  ) {
    return {
      intencao: "cancelar",
      confianca: 0.96,
      dados: {},
    };
  }

  if (
    contemAlgum(texto, [
      "rastreio",
      "rastrear",
      "codigo de rastreio",
      "código de rastreio",
      "onde esta meu pedido",
      "onde está meu pedido",
    ])
  ) {
    return {
      intencao: "consultar_rastreio",
      confianca: 0.97,
      dados: {},
    };
  }

  if (
    contemAlgum(texto, [
      "meu pedido",
      "status do pedido",
      "consultar pedido",
      "pedido numero",
      "pedido número",
    ])
  ) {
    return {
      intencao: "consultar_pedido",
      confianca: 0.96,
      dados: {},
    };
  }

  if (
    contemAlgum(texto, [
      "ola",
      "olá",
      "oi",
      "bom dia",
      "boa tarde",
      "boa noite",
    ])
  ) {
    return {
      intencao: "saudacao",
      confianca: 0.9,
      dados: {},
    };
  }

  if (
    contemAlgum(texto, [
      "preciso",
      "procuro",
      "tem",
      "quero comprar",
      "valor",
      "preco",
      "preço",
      "produto",
      "peca",
      "peça",
    ])
  ) {
    return {
      intencao: "buscar_produto",
      confianca: 0.88,
      dados: {
        consulta: textoOriginal,
      },
    };
  }

  if (pareceDocumento(textoOriginal)) {
    return {
      intencao: "informar_documento",
      confianca: 0.82,
      dados: {
        documento:
          somenteNumeros(textoOriginal),
      },
    };
  }

  if (pareceCep(textoOriginal)) {
    return {
      intencao: "informar_cep",
      confianca: 0.8,
      dados: {
        cep: somenteNumeros(textoOriginal),
      },
    };
  }

  return {
    intencao: "mensagem_generica",
    confianca: 0.4,
    dados: {
      texto: textoOriginal,
    },
  };
}
