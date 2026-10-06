"use client";

import {
  IconCalendarX,
  IconClockCheck,
  IconClockExclamation,
  IconListDetails,
  IconUsersGroup,
} from "@tabler/icons-react";
import { getLenisInstance } from "@/lib/lenis/lenis-instance";
import { requestScrollToCard } from "@/lib/retencao/scroll-to-card-event";
import { FloatingNavSidebar } from "@/components/ui/floating-nav-sidebar";
import { IconeNav, useSecaoAtiva } from "@/components/gestor/nav-secao-ativa";

/**
 * Índices dos cards no trilho horizontal — precisam bater com a ordem real
 * do array `slides` em tempo-indisp-section.tsx: 0 = cards de resumo +
 * Pausas detalhadas, 1 = Aderência, 2 = Pausas NR17 não tiradas, 3 = Estouro.
 */
const TRILHO_CARD = {
  resumo: 0,
  aderencia: 1,
  pausasNaoRealizadas: 2,
  estouroPausa: 3,
} as const;

// Só tamanho: a cor do ícone (--muted-foreground / --foreground no ativo)
// vem de globals.css (.nav-secoes [data-nav-icone]).
const ICON_CLASS = "h-5 w-5 shrink-0";

/** Bloco do topo (título + controles + anexo + tabela de operadores). */
const ID_TOPO = "tempo-indisp-section";

/**
 * Navegação lateral de /s/reports/tempo-indisponibilidade — mesmo
 * componente e comportamento do ConsolidadoNavSidebar (FloatingNavSidebar
 * + .nav-secoes): item da seção visível destacado, divisória entre a
 * tabela do topo e os slides do Analítico. Só em telas >= 1024px.
 */
export function TempoIndispNavSidebar() {
  const ativo = useSecaoAtiva(ID_TOPO);

  function scrollToTabela() {
    const el = document.getElementById(ID_TOPO);
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
      label: "Tabela de operadores",
      href: `#${ID_TOPO}`,
      icon: (
        <IconeNav ativo={ativo === "topo"}>
          <IconUsersGroup className={ICON_CLASS} />
        </IconeNav>
      ),
      onClick: scrollToTabela,
    },
    {
      label: "Pausas detalhadas",
      href: "#trilho-card-0",
      icon: (
        <IconeNav ativo={ativo === TRILHO_CARD.resumo}>
          <IconListDetails className={ICON_CLASS} />
        </IconeNav>
      ),
      onClick: () => requestScrollToCard(TRILHO_CARD.resumo),
    },
    {
      label: "Aderência de login e pausas",
      href: "#trilho-card-1",
      icon: (
        <IconeNav ativo={ativo === TRILHO_CARD.aderencia}>
          <IconClockCheck className={ICON_CLASS} />
        </IconeNav>
      ),
      onClick: () => requestScrollToCard(TRILHO_CARD.aderencia),
    },
    {
      label: "Pausas NR17 não tiradas",
      href: "#trilho-card-2",
      icon: (
        <IconeNav ativo={ativo === TRILHO_CARD.pausasNaoRealizadas}>
          <IconCalendarX className={ICON_CLASS} />
        </IconeNav>
      ),
      onClick: () => requestScrollToCard(TRILHO_CARD.pausasNaoRealizadas),
    },
    {
      label: "Estouro de NR17",
      href: "#trilho-card-3",
      icon: (
        <IconeNav ativo={ativo === TRILHO_CARD.estouroPausa}>
          <IconClockExclamation className={ICON_CLASS} />
        </IconeNav>
      ),
      onClick: () => requestScrollToCard(TRILHO_CARD.estouroPausa),
    },
  ];

  return (
    <FloatingNavSidebar
      links={links}
      wrapperClassName="nav-secoes"
      dataPage="reports-tempo-indisponibilidade"
      // Divisória entre a tabela do topo e os slides do Analítico.
      divisoriasApos={[0]}
    />
  );
}
