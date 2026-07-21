import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VelON OS | Sistema Operacional Empresarial",
  description: "CRM, automação e inteligência comercial da VelON IA.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
