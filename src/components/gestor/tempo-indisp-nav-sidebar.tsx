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

/**
 * Índices dos cards no trilho horizontal de /reports/tempo-indisponibilidade
 * — precisam bater com a ordem real do array `slides` em
 * tempo-indisp-section.tsx: 0 = 4 cards de resumo + Tabela de Pausas
 * Detalhadas (JUNTOS, um único slide), 1 = Aderência, 2 = Pausas
 * obrigatórias não realizadas, 3 = Estouro de pausa.
 */
const TRILHO_CARD = {
  resumo: 0,
  aderencia: 1,
  pausasNaoRealizadas: 2,
  estouroPausa: 3,
} as const;

// Antes: "text-neutral-700 dark:text-neutral-200" — cinza hardcoded fora do
// tema (o projeto não usa a estratégia `.dark` do Tailwind, então o `dark:`
// nunca disparava). Agora lê --muted-foreground do escopo
// [data-page="reports-tempo-indisponibilidade"] (herdado via
// wrapperClassName/dataPage abaixo) — mesmo ajuste de ConsolidadoNavSidebar.
const ICON_CLASS = "h-5 w-5 shrink-0 text-[color:var(--muted-foreground)]";

/**
 * Navegação lateral animada do trilho de /reports/tempo-indisponibilidade —
 * MESMO componente/mecanismo de ConsolidadoNavSidebar (ambos delegam a
 * FloatingNavSidebar), só com a lista de itens/ícones trocada.
 *
 * Sem destaque de item ativo — MESMA lógica do consolidado, que não tem
 * nenhuma (nenhum scroll-spy, nenhum IntersectionObserver, nenhum estado de
 * "item selecionado" em lugar nenhum do projeto).
 *
 * Primeiro item ("Tabela operadores") = a tabela unificada de operadores.
 * Alvo do scroll: id="tempo-indisp-cabecalho" (bloco do título da página),
 * sem offset — MESMO ponto de chegada do Consolidado (#equipe-section):
 * a linha "{nome} fez um report às HH:MM" fica logo abaixo do header fixo,
 * seguida dos controles, anexo e tabela.
 *
 * Um item por SLIDE — "Resumo" (slide 0), "Aderência" (slide 1), "Pausas
 * Detalhadas" (rótulo do item que leva ao slide 0 — reaproveita o mesmo
 * onClick de "Resumo", só o texto mudou) — na verdade "Resumo" FOI
 * renomeado pra "Pausas Detalhadas" (mesmo destino/ícone/posição, só o
 * rótulo mudou). Os itens do trilho, com o MESMO ícone que aparece ao lado
 * do título do card correspondente:
 *   - "Pausas detalhadas" → IconListDetails
 *   - "Aderência de login e pausas" → IconClockCheck
 *   - "Pausas NR17 não tiradas" → IconCalendarX
 *   - "Estouro de NR17" → IconClockExclamation
 */
export function TempoIndispNavSidebar() {
  // Mesmo ponto de chegada do Consolidado (scrollToEquipe em
  // consolidado-nav-sidebar.tsx): topo do bloco do título, SEM offset — o
  // título fica sob o header fixo e a linha "{nome} fez um report às HH:MM"
  // aparece logo abaixo dele, seguida dos controles/anexo/tabela.
  function scrollToTabela() {
    const el = document.getElementById("tempo-indisp-cabecalho");
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
      label: "Tabela operadores",
      href: "#tempo-indisp-cabecalho",
      icon: <IconUsersGroup className={ICON_CLASS} />,
      onClick: scrollToTabela,
    },
    {
      label: "Pausas detalhadas",
      href: "#trilho-card-0",
      icon: <IconListDetails className={ICON_CLASS} />,
      onClick: () => requestScrollToCard(TRILHO_CARD.resumo),
    },
    {
      label: "Aderência de login e pausas",
      href: "#trilho-card-1",
      icon: <IconClockCheck className={ICON_CLASS} />,
      onClick: () => requestScrollToCard(TRILHO_CARD.aderencia),
    },
    {
      label: "Pausas NR17 não tiradas",
      href: "#trilho-card-2",
      icon: <IconCalendarX className={ICON_CLASS} />,
      onClick: () => requestScrollToCard(TRILHO_CARD.pausasNaoRealizadas),
    },
    {
      label: "Estouro de NR17",
      href: "#trilho-card-3",
      icon: <IconClockExclamation className={ICON_CLASS} />,
      onClick: () => requestScrollToCard(TRILHO_CARD.estouroPausa),
    },
  ];

  return (
    <FloatingNavSidebar
      links={links}
      wrapperClassName="reports-tempo-indisp-nav"
      dataPage="reports-tempo-indisponibilidade"
    />
  );
}
