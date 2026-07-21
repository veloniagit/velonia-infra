const evolutionApiUrl = (
  process.env.EVOLUTION_INTERNAL_URL ||
  process.env.EVOLUTION_API_URL
)?.replace(/\/$/, "");

const evolutionApiKey =
  process.env.EVOLUTION_API_KEY;

export const evolutionInstance =
  process.env.EVOLUTION_INSTANCE || "velonia";

export async function evolutionFetch<T>(
  caminho: string,
  init: RequestInit = {},
): Promise<T> {
  if (!evolutionApiUrl) {
    throw new Error(
      "EVOLUTION_API_URL não configurada.",
    );
  }

  if (!evolutionApiKey) {
    throw new Error(
      "EVOLUTION_API_KEY não configurada.",
    );
  }

  const resposta = await fetch(
    `${evolutionApiUrl}${caminho}`,
    {
      ...init,
      cache: "no-store",
      headers: {
        apikey: evolutionApiKey,
        "Content-Type": "application/json",
        ...init.headers,
      },
    },
  );

  const texto = await resposta.text();

  let dados: unknown = null;

  if (texto) {
    try {
      dados = JSON.parse(texto);
    } catch {
      dados = {
        mensagem: texto,
      };
    }
  }

  if (!resposta.ok) {
    throw new Error(
      `Evolution API respondeu HTTP ${resposta.status}: ` +
        JSON.stringify(dados),
    );
  }

  return dados as T;
}
