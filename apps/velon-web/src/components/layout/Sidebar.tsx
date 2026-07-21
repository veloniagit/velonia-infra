"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type MenuItem = {
  nome: string;
  href: string;
  icone: string;
};

const menuPrincipal: MenuItem[] = [
  {
    nome: "Dashboard",
    href: "/dashboard",
    icone: "◫",
  },
  {
    nome: "Leads",
    href: "/leads",
    icone: "◉",
  },
  {
    nome: "CRM",
    href: "/clientes",
    icone: "◎",
  },
  {
    nome: "WhatsApp",
    href: "/admin/whatsapp",
    icone: "◉",
  },
  {
    nome: "Produtos",
    href: "/produtos",
    icone: "◇",
  },
  {
    nome: "Estoque",
    href: "/estoque",
    icone: "▦",
  },
  {
    nome: "Orçamentos",
    href: "/orcamentos",
    icone: "▤",
  },
  {
    nome: "Pedidos",
    href: "/pedidos",
    icone: "▣",
  },
  {
    nome: "Financeiro",
    href: "/financeiro",
    icone: "◈",
  },
  {
    nome: "Inteligência IA",
    href: "/inteligencia",
    icone: "✦",
  },
  {
    nome: "Relatórios",
    href: "/relatorios",
    icone: "◩",
  },
];

const menuAdministrativo: MenuItem[] = [
  {
    nome: "Configurações",
    href: "/configuracoes",
    icone: "⚙",
  },
  {
    nome: "Usuários",
    href: "/usuarios",
    icone: "♙",
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  function itemAtivo(href: string): boolean {
    if (href === "/dashboard") {
      return pathname === href;
    }

    return pathname.startsWith(href);
  }

  function renderizarItem(item: MenuItem) {
    const ativo = itemAtivo(item.href);

    return (
      <Link
        key={item.href}
        href={item.href}
        className={`velon-sidebar-link ${
          ativo ? "velon-sidebar-link-active" : ""
        }`}
      >
        <span className="velon-sidebar-icon">
          {item.icone}
        </span>

        <span>{item.nome}</span>
      </Link>
    );
  }

  return (
    <aside className="velon-sidebar">
      <div className="velon-brand">
        <div className="velon-brand-mark">V</div>

        <div>
          <strong>VelON OS</strong>
          <span>Sistema Operacional IA</span>
        </div>
      </div>

      <div className="velon-company-card">
        <div className="velon-company-avatar">VI</div>

        <div>
          <strong>VelON IA</strong>
          <span>Ambiente principal</span>
        </div>

        <span className="velon-company-status" />
      </div>

      <nav className="velon-sidebar-nav">
        <p className="velon-menu-label">
          Operação
        </p>

        {menuPrincipal.map(renderizarItem)}

        <p className="velon-menu-label velon-menu-label-spaced">
          Administração
        </p>

        {menuAdministrativo.map(renderizarItem)}
      </nav>

      <div className="velon-sidebar-footer">
        <div className="velon-ai-status">
          <span className="velon-pulse-dot" />

          <div>
            <strong>VelON IA ativa</strong>
            <span>Operação monitorada</span>
          </div>
        </div>

        <span className="velon-version">
          VelON OS v2.0
        </span>
      </div>
    </aside>
  );
}
