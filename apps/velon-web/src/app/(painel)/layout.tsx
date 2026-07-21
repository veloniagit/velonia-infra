import type { ReactNode } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

type PainelLayoutProps = {
  children: ReactNode;
};

export default function PainelLayout({
  children,
}: PainelLayoutProps) {
  return (
    <div className="velon-app-shell">
      <Sidebar />

      <div className="velon-app-main">
        <Topbar />

        <div className="velon-page-content">
          {children}
        </div>
      </div>
    </div>
  );
}
