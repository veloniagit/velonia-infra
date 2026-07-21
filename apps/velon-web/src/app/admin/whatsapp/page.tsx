"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

type StatusWhatsapp = {
  status: string;
  evolutionOnline?: boolean;
  instanciaEncontrada?: boolean;
  instancia?: string;
  connectionStatus?: string;
  conectado?: boolean;
  profileName?: string | null;
  profilePicUrl?: string | null;
  ownerJid?: string | null;
  numero?: string | null;
  atualizadoEm?: string | null;
  metricas?: {
    mensagens: number;
    contatos: number;
    conversas: number;
  };
  mensagem?: string;
};

type RespostaQr = {
  status: string;
  qrCodeDisponivel?: boolean;
  base64?: string | null;
  mensagem?: string;
};

export default function WhatsappAdminPage() {
  const [token, setToken] = useState("");
  const [status, setStatus] =
    useState<StatusWhatsapp | null>(null);
  const [qrCode, setQrCode] =
    useState<string | null>(null);
  const [carregando, setCarregando] =
    useState(false);
  const [erro, setErro] =
    useState<string | null>(null);

  useEffect(() => {
    const salvo =
      window.sessionStorage.getItem(
        "velon-whatsapp-admin-token",
      );

    if (salvo) {
      setToken(salvo);
    }
  }, []);

  const headers = useCallback(
    () => ({
      "Content-Type": "application/json",
      "x-admin-token": token,
    }),
    [token],
  );

  const consultarStatus =
    useCallback(async () => {
      if (!token) {
        return;
      }

      try {
        const resposta = await fetch(
          "/api/admin/whatsapp/status",
          {
            cache: "no-store",
            headers: headers(),
          },
        );

        const dados =
          (await resposta.json()) as StatusWhatsapp;

        if (!resposta.ok) {
          throw new Error(
            dados.mensagem ||
              "Falha ao consultar status.",
          );
        }

        setStatus(dados);
        setErro(null);

        if (dados.conectado) {
          setQrCode(null);
        }
      } catch (error) {
        setErro(
          error instanceof Error
            ? error.message
            : "Erro desconhecido.",
        );
      }
    }, [headers, token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    consultarStatus();

    const intervalo = window.setInterval(
      consultarStatus,
      5000,
    );

    return () =>
      window.clearInterval(intervalo);
  }, [consultarStatus, token]);

  function salvarToken() {
    window.sessionStorage.setItem(
      "velon-whatsapp-admin-token",
      token,
    );

    consultarStatus();
  }

  async function gerarQrCode() {
    setCarregando(true);
    setErro(null);

    try {
      const resposta = await fetch(
        "/api/admin/whatsapp/conectar",
        {
          method: "POST",
          headers: headers(),
        },
      );

      const dados =
        (await resposta.json()) as RespostaQr;

      if (!resposta.ok) {
        throw new Error(
          dados.mensagem ||
            "Falha ao gerar QR Code.",
        );
      }

      if (!dados.base64) {
        throw new Error(
          "A Evolution API não retornou um QR Code.",
        );
      }

      setQrCode(dados.base64);
      await consultarStatus();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro desconhecido.",
      );
    } finally {
      setCarregando(false);
    }
  }

  async function desconectar() {
    const confirmado = window.confirm(
      "Deseja realmente desconectar o WhatsApp?",
    );

    if (!confirmado) {
      return;
    }

    setCarregando(true);
    setErro(null);

    try {
      const resposta = await fetch(
        "/api/admin/whatsapp/desconectar",
        {
          method: "POST",
          headers: headers(),
        },
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.mensagem ||
            "Falha ao desconectar.",
        );
      }

      setQrCode(null);
      await consultarStatus();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro desconhecido.",
      );
    } finally {
      setCarregando(false);
    }
  }

  const conectado =
    status?.connectionStatus === "open";

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px",
        background: "#06111f",
        color: "#ffffff",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "20px",
          marginBottom: "32px",
        }}
      >
        <div>
          <p
            style={{
              color: "#3294ff",
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            VelON IA
          </p>

          <h1>WhatsApp Manager</h1>

          <p style={{ color: "#8ca3bd" }}>
            Gerencie a conexão da Evolution API
            diretamente pelo VelON OS.
          </p>
        </div>
      </header>

      {!status && (
        <section
          style={{
            maxWidth: "600px",
            padding: "24px",
            border: "1px solid #22364d",
            borderRadius: "16px",
            background: "#0b1b2e",
          }}
        >
          <h2>Acesso administrativo</h2>

          <p style={{ color: "#8ca3bd" }}>
            Informe o token administrativo criado
            na VPS.
          </p>

          <input
            type="password"
            value={token}
            onChange={(evento) =>
              setToken(evento.target.value)
            }
            placeholder="Token administrativo"
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "10px",
              border: "1px solid #29425e",
              background: "#071523",
              color: "#ffffff",
              marginBottom: "12px",
            }}
          />

          <button
            type="button"
            onClick={salvarToken}
            style={{
              padding: "13px 20px",
              border: 0,
              borderRadius: "10px",
              background: "#1677ff",
              color: "#ffffff",
              cursor: "pointer",
            }}
          >
            Entrar no WhatsApp Manager
          </button>
        </section>
      )}

      {status && (
        <>
          <section
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "18px",
              marginBottom: "24px",
            }}
          >
            <article
              style={{
                padding: "22px",
                border: "1px solid #22364d",
                borderRadius: "16px",
                background: "#0b1b2e",
              }}
            >
              <span style={{ color: "#8ca3bd" }}>
                Evolution API
              </span>

              <h2>
                {status.evolutionOnline
                  ? "Online"
                  : "Offline"}
              </h2>
            </article>

            <article
              style={{
                padding: "22px",
                border: "1px solid #22364d",
                borderRadius: "16px",
                background: "#0b1b2e",
              }}
            >
              <span style={{ color: "#8ca3bd" }}>
                WhatsApp
              </span>

              <h2>
                {conectado
                  ? "Conectado"
                  : "Desconectado"}
              </h2>
            </article>

            <article
              style={{
                padding: "22px",
                border: "1px solid #22364d",
                borderRadius: "16px",
                background: "#0b1b2e",
              }}
            >
              <span style={{ color: "#8ca3bd" }}>
                Instância
              </span>

              <h2>
                {status.instancia || "velonia"}
              </h2>
            </article>

            <article
              style={{
                padding: "22px",
                border: "1px solid #22364d",
                borderRadius: "16px",
                background: "#0b1b2e",
              }}
            >
              <span style={{ color: "#8ca3bd" }}>
                Conversas
              </span>

              <h2>
                {status.metricas?.conversas ?? 0}
              </h2>
            </article>
          </section>

          <section
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(300px, 1fr) minmax(280px, 420px)",
              gap: "24px",
            }}
          >
            <article
              style={{
                padding: "26px",
                border: "1px solid #22364d",
                borderRadius: "18px",
                background: "#0b1b2e",
              }}
            >
              <h2>Status da conexão</h2>

              <p style={{ color: "#8ca3bd" }}>
                Estado atual:{" "}
                <strong
                  style={{
                    color: conectado
                      ? "#45d483"
                      : "#ffb547",
                  }}
                >
                  {status.connectionStatus}
                </strong>
              </p>

              {status.profileName && (
                <p>
                  Perfil:{" "}
                  <strong>
                    {status.profileName}
                  </strong>
                </p>
              )}

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  flexWrap: "wrap",
                  marginTop: "24px",
                }}
              >
                <button
                  type="button"
                  onClick={gerarQrCode}
                  disabled={carregando}
                  style={{
                    padding: "13px 18px",
                    border: 0,
                    borderRadius: "10px",
                    background: "#1677ff",
                    color: "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  {carregando
                    ? "Processando..."
                    : "Gerar/atualizar QR Code"}
                </button>

                <button
                  type="button"
                  onClick={consultarStatus}
                  style={{
                    padding: "13px 18px",
                    borderRadius: "10px",
                    border: "1px solid #38516c",
                    background: "#10243a",
                    color: "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  Atualizar status
                </button>

                <button
                  type="button"
                  onClick={desconectar}
                  style={{
                    padding: "13px 18px",
                    borderRadius: "10px",
                    border: "1px solid #6b3541",
                    background: "#35141d",
                    color: "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  Desconectar
                </button>
              </div>

              {erro && (
                <p
                  style={{
                    marginTop: "20px",
                    color: "#ff7a8a",
                  }}
                >
                  {erro}
                </p>
              )}
            </article>

            <aside
              style={{
                padding: "26px",
                border: "1px solid #22364d",
                borderRadius: "18px",
                background: "#0b1b2e",
                textAlign: "center",
              }}
            >
              <h2>QR Code</h2>

              {conectado ? (
                <div>
                  <div
                    style={{
                      fontSize: "52px",
                      margin: "20px 0",
                    }}
                  >
                    ✅
                  </div>

                  <strong>
                    WhatsApp conectado
                  </strong>
                </div>
              ) : qrCode ? (
                <>
                  <img
                    src={qrCode}
                    alt="QR Code do WhatsApp"
                    style={{
                      width: "100%",
                      maxWidth: "320px",
                      background: "#ffffff",
                      borderRadius: "12px",
                      padding: "10px",
                    }}
                  />

                  <p
                    style={{
                      color: "#8ca3bd",
                      fontSize: "14px",
                    }}
                  >
                    WhatsApp → Aparelhos conectados
                    → Conectar aparelho.
                  </p>
                </>
              ) : (
                <p style={{ color: "#8ca3bd" }}>
                  Clique em “Gerar/atualizar QR
                  Code”.
                </p>
              )}
            </aside>
          </section>
        </>
      )}
    </main>
  );
}
