"use client";

import { Fragment, useState } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/hover-sidebar";

interface FloatingNavLink {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
  onClick?: () => void;
  /**
   * Item apagado e sem clique (ex.: card do trilho que ainda não existe).
   * Opcional — sem ele o item fica como sempre.
   */
  desabilitado?: boolean;
}

interface FloatingNavSidebarProps {
  links: FloatingNavLink[];
  /**
   * Classe extra opcional no wrapper `fixed` — aditivo, default nenhuma
   * classe extra (comportamento idêntico ao de sempre). Consolidado,
   * Tempo/Indisponibilidade e TMA passam "nav-secoes" (visual do padrão,
   * globals.css).
   */
  wrapperClassName?: string;
  /**
   * `data-page` opcional no wrapper — aditivo, default ausente (nenhum
   * atributo é renderizado, igual a antes). Consolidado,
   * Tempo/Indisponibilidade e TMA passam o data-page da rota pra este wrapper
   * herdar o tema e a fonte da página, já que é renderizado como IRMÃO da
   * div `[data-page]` principal (position: fixed), não dentro dela.
   */
  dataPage?: string;
  /**
   * Índices dos links DEPOIS dos quais entra uma divisória fina — aditivo,
   * default nenhum (visual de sempre). Consolidado, Tempo/Indisponibilidade
   * e TMA separam a tabela de operadores (topo) dos slides do Analítico.
   */
  divisoriasApos?: number[];
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
export function FloatingNavSidebar({
  links,
  wrapperClassName,
  dataPage,
  divisoriasApos = [],
}: FloatingNavSidebarProps) {
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
          {links.map((link, i) => (
            <Fragment key={link.label}>
              <SidebarLink
                // Desabilitado: SidebarLink tira do Tab, marca aria-disabled
                // e bloqueia a navegação; aqui só o visual (apagado, sem
                // ponteiro/realce).
                link={link}
                desabilitado={link.desabilitado}
                className={link.desabilitado ? "pointer-events-none opacity-40" : undefined}
              />
              {divisoriasApos.includes(i) && (
                <div aria-hidden="true" data-nav-divisoria className="bg-border my-1 h-px w-full shrink-0" />
              )}
            </Fragment>
          ))}
        </SidebarBody>
      </Sidebar>
    </div>
  );
}
