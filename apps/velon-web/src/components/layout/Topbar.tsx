"use client";

import { usePathname } from "next/navigation";

const titulos: Record<string, string> = {
  "/dashboard": "Dashboard Executivo",
  "/clientes": "CRM e Clientes",
  "/admin/whatsapp": "WhatsApp Manager",
  "/produtos": "Produtos",
  "/estoque": "Gestão de Estoque",
  "/orcamentos": "Orçamentos",
  "/pedidos": "Pedidos",
  "/financeiro": "Financeiro",
  "/inteligencia": "Inteligência Artificial",
  "/relatorios": "Relatórios",
  "/configuracoes": "Configurações",
  "/usuarios": "Usuários",
};

export default function Topbar() {
  const pathname = usePathname();

  const rotaEncontrada = Object.keys(titulos).find(
    (rota) =>
      pathname === rota || pathname.startsWith(`${rota}/`),
  );

  const titulo =
    (rotaEncontrada && titulos[rotaEncontrada]) ||
    "VelON OS";

  return (
    <header className="velon-topbar">
      <div className="velon-topbar-title">
        <span>VelON OS</span>
        <strong>{titulo}</strong>
      </div>

      <div className="velon-topbar-actions">
        <label className="velon-global-search">
          <span>⌕</span>

          <input
            type="search"
            placeholder="Pesquisar clientes, pedidos..."
            aria-label="Pesquisa global"
          />

          <kbd>Ctrl K</kbd>
        </label>

        <div className="velon-whatsapp-online">
          <span />
          WhatsApp online
        </div>

        <button
          type="button"
          className="velon-icon-button"
          aria-label="Notificações"
        >
          ♢
          <span className="velon-notification-count">
            3
          </span>
        </button>

        <button
          type="button"
          className="velon-profile-button"
        >
          <span className="velon-profile-avatar">
            YG
          </span>

          <span className="velon-profile-text">
            <strong>Administrador</strong>
            <small>VelON IA</small>
          </span>

          <span>⌄</span>
        </button>
      </div>
    </header>
  );
}
