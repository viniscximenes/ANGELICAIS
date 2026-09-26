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
  /**
   * Classe extra opcional no wrapper `fixed` — aditivo, default nenhuma
   * classe extra (comportamento idêntico ao de sempre). Usado só por
   * ConsolidadoNavSidebar (passa "reports-consolidado-nav") pra dar um
   * gancho de CSS escopado ao tema Zen Linen, sem mexer no visual padrão
   * consumido por TempoIndispNavSidebar (que não passa esta prop).
   */
  wrapperClassName?: string;
  /**
   * `data-page` opcional no wrapper — aditivo, default ausente (nenhum
   * atributo é renderizado, igual a antes). ConsolidadoNavSidebar passa
   * "reports-consolidado" pra este wrapper herdar as CSS custom properties
   * do tema (definidas em reports-consolidado.css por esse seletor de
   * atributo), já que é renderizado como IRMÃO da div `[data-page]`
   * principal (position: fixed), não dentro dela.
   */
  dataPage?: string;
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
export function FloatingNavSidebar({ links, wrapperClassName, dataPage }: FloatingNavSidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      data-page={dataPage}
      className={
        wrapperClassName
          ? `fixed top-24 right-4 z-40 hidden lg:block ${wrapperClassName}`
          : "fixed top-24 right-4 z-40 hidden lg:block"
      }
    >
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
