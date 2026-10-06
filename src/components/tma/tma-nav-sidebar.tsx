"use client";

import {
  IconArrowsMaximize,
  IconChartBar,
  IconChartLine,
  IconPhoneCall,
  IconScale,
  IconTable,
  IconUsersGroup,
} from "@tabler/icons-react";
import { getLenisInstance } from "@/lib/lenis/lenis-instance";
import { requestScrollToCard } from "@/lib/retencao/scroll-to-card-event";
import { FloatingNavSidebar } from "@/components/ui/floating-nav-sidebar";
import { IconeNav, useSecaoAtiva } from "@/components/gestor/nav-secao-ativa";

/**
 * Índices dos cards no trilho horizontal — precisam bater com a ordem real
 * do array `slides` em analitico-tma-section.tsx (REORDENADA nesta rodada,
 * NÃO reaproveita os índices antigos):
 * 0 = "Visão Geral" (cards grandes + gráfico "Evolução do TMA"),
 * 1 = "TMA por Tema" (tabela Operador × Bucket — ERA o último slide),
 * 2 = "TMA por Tema (Gestor)" (card agregado por equipe — ERA o 2º slide),
 * 3 = Rechamada, 4 = Fora da Curva (ERA depois de Peso Desigual, agora antes),
 * 5 = Peso Desigual (ERA antes de Fora da Curva, agora por último).
 *
 * ATENÇÃO: dois rótulos parecidos, donos TROCADOS nesta rodada — "TMA por
 * Tema" (sem sufixo) agora é a TABELA (índice 1); "TMA por Tema (Gestor)" é
 * o card agregado (índice 2). Não inverter.
 */
const TRILHO_CARD = {
  visaoGeral: 0,
  tmaPorTemaTabela: 1,
  tmaPorTemaGestor: 2,
  rechamada: 3,
  foraDaCurva: 4,
  pesoDesigual: 5,
} as const;

// Só tamanho: a cor do ícone (--muted-foreground / --foreground no ativo)
// vem de globals.css (.nav-secoes [data-nav-icone]).
const ICON_CLASS = "h-5 w-5 shrink-0";

/**
 * Navegação lateral de /s/reports/tma-peso — mesmo componente e
 * comportamento do ConsolidadoNavSidebar (FloatingNavSidebar + .nav-secoes):
 * item da seção visível destacado, divisória entre a tabela do topo e os
 * slides do Analítico. Só em telas >= 1024px. Ícones = os dos títulos de
 * cada card (IconTable na tabela Operador × tema, que não tem ícone).
 */
export function TmaNavSidebar() {
  const ativo = useSecaoAtiva("equipe-section");

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
      label: "Tabela de operadores",
      href: "#equipe-section",
      icon: (
        <IconeNav ativo={ativo === "topo"}>
          <IconUsersGroup className={ICON_CLASS} />
        </IconeNav>
      ),
      onClick: scrollToEquipe,
    },
    {
      label: "Evolução da equipe",
      href: "#trilho-card-0",
      icon: (
        <IconeNav ativo={ativo === TRILHO_CARD.visaoGeral}>
          <IconChartLine className={ICON_CLASS} />
        </IconeNav>
      ),
      onClick: () => requestScrollToCard(TRILHO_CARD.visaoGeral),
    },
    {
      label: "TMA por tema - Operador",
      href: "#trilho-card-1",
      icon: (
        <IconeNav ativo={ativo === TRILHO_CARD.tmaPorTemaTabela}>
          <IconTable className={ICON_CLASS} />
        </IconeNav>
      ),
      onClick: () => requestScrollToCard(TRILHO_CARD.tmaPorTemaTabela),
    },
    {
      label: "TMA por tema - Supervisor",
      href: "#trilho-card-2",
      icon: (
        <IconeNav ativo={ativo === TRILHO_CARD.tmaPorTemaGestor}>
          <IconChartBar className={ICON_CLASS} />
        </IconeNav>
      ),
      onClick: () => requestScrollToCard(TRILHO_CARD.tmaPorTemaGestor),
    },
    {
      label: "Rechamada",
      href: "#trilho-card-3",
      icon: (
        <IconeNav ativo={ativo === TRILHO_CARD.rechamada}>
          <IconPhoneCall className={ICON_CLASS} />
        </IconeNav>
      ),
      onClick: () => requestScrollToCard(TRILHO_CARD.rechamada),
    },
    {
      label: "Fora da curva",
      href: "#trilho-card-4",
      icon: (
        <IconeNav ativo={ativo === TRILHO_CARD.foraDaCurva}>
          <IconArrowsMaximize className={ICON_CLASS} />
        </IconeNav>
      ),
      onClick: () => requestScrollToCard(TRILHO_CARD.foraDaCurva),
    },
    {
      label: "Peso desigual",
      href: "#trilho-card-5",
      icon: (
        <IconeNav ativo={ativo === TRILHO_CARD.pesoDesigual}>
          <IconScale className={ICON_CLASS} />
        </IconeNav>
      ),
      onClick: () => requestScrollToCard(TRILHO_CARD.pesoDesigual),
    },
  ];

  return (
    <FloatingNavSidebar
      links={links}
      wrapperClassName="nav-secoes"
      dataPage="reports-tma-peso"
      // Divisória entre a tabela do topo e os slides do Analítico.
      divisoriasApos={[0]}
    />
  );
}
