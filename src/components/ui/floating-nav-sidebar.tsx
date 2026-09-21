"use client";

import { useState } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/hover-sidebar";

interface FloatingNavLink {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
  onClick?: () => void;
}

interface FloatingNavSidebarProps {
  links: FloatingNavLink[];
}

/**
 * Casca genérica extraída literalmente de ConsolidadoNavSidebar (o wrapper
 * fixed + Sidebar/SidebarBody/SidebarLink em loop) — SEM nenhuma mudança de
 * comportamento/visual, só parametrizando `links` em vez de tê-los
 * hardcoded. ConsolidadoNavSidebar continua montando exatamente os mesmos 8
 * itens de antes e delegando a renderização pra cá; qualquer outra página
 * (ex.: tempo-indisponibilidade) monta sua própria lista de itens e reusa
 * este mesmo componente, sem duplicar a lógica de posicionamento/hover.
 */
export function FloatingNavSidebar({ links }: FloatingNavSidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed top-24 right-4 z-40 hidden lg:block">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="border-border/60 h-auto justify-start gap-1 rounded-xl border py-4 shadow-lg">
          {links.map((link) => (
            <SidebarLink key={link.label} link={link} />
          ))}
        </SidebarBody>
      </Sidebar>
    </div>
  );
}
