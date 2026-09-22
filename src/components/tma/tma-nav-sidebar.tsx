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

const ICON_CLASS = "h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200";

/**
 * Navegação lateral animada do trilho de /reports/tma — MESMO
 * componente/mecanismo de ConsolidadoNavSidebar/TempoIndispNavSidebar
 * (ambos delegam a FloatingNavSidebar, sem editá-lo), só com a lista de
 * itens/ícones trocada pros 6 slides da TMA.
 *
 * "Equipe" (mesmo padrão do Consolidado) rola até a tabela principal —
 * id="equipe-section" em GestorTmaSection.
 *
 * Ícones reaproveitados dos MESMOS ícones já usados no título de cada
 * card/seção correspondente (IconChartLine em EvolucaoTmaChart, IconChartBar
 * em TmaPorTemaCard, IconPhoneCall em CardRechamada, IconScale em
 * CardPesoDesigual, IconArrowsMaximize em CardForaDaCurva) — a tabela
 * Operador × Bucket (AnaliticoTmaTabela) não tem ícone no título, então usei
 * IconTable aqui, sem alterar o título dela.
 */
export function TmaNavSidebar() {
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
      label: "TMA por Tema",
      href: "#trilho-card-1",
      icon: <IconTable className={ICON_CLASS} />,
      onClick: () => requestScrollToCard(TRILHO_CARD.tmaPorTemaTabela),
    },
    {
      label: "TMA por Tema (Gestor)",
      href: "#trilho-card-2",
      icon: <IconChartBar className={ICON_CLASS} />,
      onClick: () => requestScrollToCard(TRILHO_CARD.tmaPorTemaGestor),
    },
    {
      label: "Rechamada",
      href: "#trilho-card-3",
      icon: <IconPhoneCall className={ICON_CLASS} />,
      onClick: () => requestScrollToCard(TRILHO_CARD.rechamada),
    },
    {
      label: "Fora da Curva",
      href: "#trilho-card-4",
      icon: <IconArrowsMaximize className={ICON_CLASS} />,
      onClick: () => requestScrollToCard(TRILHO_CARD.foraDaCurva),
    },
    {
      label: "Peso Desigual",
      href: "#trilho-card-5",
      icon: <IconScale className={ICON_CLASS} />,
      onClick: () => requestScrollToCard(TRILHO_CARD.pesoDesigual),
    },
  ];

  return <FloatingNavSidebar links={links} />;
}
