"use client";

import { useState } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/hover-sidebar";
import {
  IconUsersGroup,
  IconChartLine,
  IconTags,
  IconAward,
  IconChartPie,
  IconCopy,
} from "@tabler/icons-react";
import { getLenisInstance } from "@/lib/lenis/lenis-instance";
import { requestScrollToCard } from "@/lib/retencao/scroll-to-card-event";

/**
 * Índices dos cards no trilho horizontal — precisam bater com a ordem real
 * do array `slides` em retencao-detalhe-section.tsx:
 * 0 = visão geral + evolução, 1 = retenção por tema, 2 = divisor de quartil,
 * 3 = desempenho por segmento, 4 = copiar contratos.
 */
const TRILHO_CARD = {
  visaoGeral: 0,
  temas: 1,
  quartis: 2,
  segmentos: 3,
  contratos: 4,
} as const;

const ICON_CLASS = "h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200";

/**
 * Navegação lateral animada (hover expande 60px → 300px, padrão Aceternity —
 * ver @/components/ui/hover-sidebar), EXCLUSIVA de /reports/consolidado.
 * Renderizada só no page.tsx desta rota — não é layout global, não afeta
 * nenhuma outra página, e não substitui o menu principal do dashboard
 * (@/components/dashboard/sidebar.tsx), que continua intacto.
 *
 * Só aparece em telas >= 1024px (mesmo breakpoint do trilho horizontal
 * pinado — DESKTOP_MEDIA_QUERY em retencao-horizontal-scroll.tsx). Abaixo
 * disso o trilho nem existe (as seções já ficam empilhadas verticalmente no
 * fluxo normal), então um atalho de navegação separado não agrega e evita
 * adaptar o comportamento mobile (hambúrguer fullscreen) embutido no
 * componente original, que não foi desenhado pra conviver com o header/menu
 * mobile que esta página já tem.
 */
export function ConsolidadoNavSidebar() {
  const [open, setOpen] = useState(false);

  function scrollToEquipe() {
    const el = document.getElementById("equipe-section");
    if (!el) return;
    const lenis = getLenisInstance();
    if (lenis) {
      lenis.scrollTo(el, { duration: 1 });
    } else {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }

  const links = [
    {
      label: "Equipe",
      href: "#equipe-section",
      icon: <IconUsersGroup className={ICON_CLASS} />,
      onClick: scrollToEquipe,
    },
    {
      label: "Visão Geral",
      href: "#trilho-card-0",
      icon: <IconChartLine className={ICON_CLASS} />,
      onClick: () => requestScrollToCard(TRILHO_CARD.visaoGeral),
    },
    {
      label: "Retenção por Tema",
      href: "#trilho-card-1",
      icon: <IconTags className={ICON_CLASS} />,
      onClick: () => requestScrollToCard(TRILHO_CARD.temas),
    },
    {
      label: "Divisor de Quartil",
      href: "#trilho-card-2",
      icon: <IconAward className={ICON_CLASS} />,
      onClick: () => requestScrollToCard(TRILHO_CARD.quartis),
    },
    {
      label: "Desempenho por Segmento",
      href: "#trilho-card-3",
      icon: <IconChartPie className={ICON_CLASS} />,
      onClick: () => requestScrollToCard(TRILHO_CARD.segmentos),
    },
    {
      label: "Copiar Contratos",
      href: "#trilho-card-4",
      icon: <IconCopy className={ICON_CLASS} />,
      onClick: () => requestScrollToCard(TRILHO_CARD.contratos),
    },
  ];

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
