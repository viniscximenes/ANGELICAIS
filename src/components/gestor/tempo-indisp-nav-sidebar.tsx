"use client";

import {
  IconCalendarX,
  IconChartLine,
  IconClockCheck,
  IconClockExclamation,
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

const ICON_CLASS = "h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200";

/**
 * Mesma altura do header fixo do app (app-header.tsx: `sticky top-0 z-30
 * h-[60px]`) — MESMA constante (HEADER_HEIGHT_PX) já usada em
 * retencao-horizontal-scroll.tsx pro pin engatar abaixo do header. Usada
 * aqui como offset negativo no lenis.scrollTo pro cabeçalho da tabela não
 * ficar escondido atrás do header sticky.
 */
const HEADER_HEIGHT_PX = 60;

/**
 * Navegação lateral animada do trilho de /reports/tempo-indisponibilidade —
 * MESMO componente/mecanismo de ConsolidadoNavSidebar (ambos delegam a
 * FloatingNavSidebar), só com a lista de itens/ícones trocada.
 *
 * Sem destaque de item ativo — MESMA lógica do consolidado, que não tem
 * nenhuma (nenhum scroll-spy, nenhum IntersectionObserver, nenhum estado de
 * "item selecionado" em lugar nenhum do projeto).
 *
 * Primeiro item ("Equipe") = a tabela unificada de operadores. Alvo do
 * scroll: id="tempo-indisp-tabela" (o card da tabela em si, cabeçalho de
 * colunas incluso) — NÃO mais id="tempo-indisp-section" (a section raiz
 * inteira, que engloba título + card de anexo + tabela + trilho). Causa do
 * ponto de chegada errado: o alvo antigo fazia o Lenis posicionar o topo
 * da SECTION (onde fica o título "Equipe") no topo da viewport — como
 * nesta página (diferente do consolidado, onde upload e tabela ficam
 * lado a lado) o card de anexo "Anexar Base" fica EMPILHADO ACIMA da
 * tabela, ele consumia a viewport visível logo abaixo do título,
 * escondendo o cabeçalho da tabela. Corrigido apontando direto pro card
 * da tabela + offset de -HEADER_HEIGHT_PX (mesma constante do header fixo
 * do app, já usada em retencao-horizontal-scroll.tsx) pro cabeçalho não
 * ficar colado/escondido atrás do header sticky.
 *
 * Um item por SLIDE — "Resumo" (slide 0), "Aderência" (slide 1), "Pausas
 * Detalhadas" (rótulo do item que leva ao slide 0 — reaproveita o mesmo
 * onClick de "Resumo", só o texto mudou) — na verdade "Resumo" FOI
 * renomeado pra "Pausas Detalhadas" (mesmo destino/ícone/posição, só o
 * rótulo mudou). Os itens do trilho, com o MESMO ícone que aparece ao lado
 * do título do card correspondente:
 *   - "Pausas Detalhadas" → IconChartLine (mesmo ícone que o consolidado
 *     usa no item equivalente "Visão Geral")
 *   - "Aderência" → IconClockCheck
 *   - "Pausas não realizadas" → IconCalendarX
 *   - "Estouro de pausa" → IconClockExclamation
 */
export function TempoIndispNavSidebar() {
  function scrollToTabela() {
    const el = document.getElementById("tempo-indisp-tabela");
    if (!el) return;
    const lenis = getLenisInstance();
    if (lenis) {
      lenis.scrollTo(el, { duration: 1, offset: -HEADER_HEIGHT_PX });
    } else {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }

  const links = [
    {
      label: "Equipe",
      href: "#tempo-indisp-tabela",
      icon: <IconUsersGroup className={ICON_CLASS} />,
      onClick: scrollToTabela,
    },
    {
      label: "Pausas Detalhadas",
      href: "#trilho-card-0",
      icon: <IconChartLine className={ICON_CLASS} />,
      onClick: () => requestScrollToCard(TRILHO_CARD.resumo),
    },
    {
      label: "Aderência",
      href: "#trilho-card-1",
      icon: <IconClockCheck className={ICON_CLASS} />,
      onClick: () => requestScrollToCard(TRILHO_CARD.aderencia),
    },
    {
      label: "Pausas não realizadas",
      href: "#trilho-card-2",
      icon: <IconCalendarX className={ICON_CLASS} />,
      onClick: () => requestScrollToCard(TRILHO_CARD.pausasNaoRealizadas),
    },
    {
      label: "Estouro de pausa",
      href: "#trilho-card-3",
      icon: <IconClockExclamation className={ICON_CLASS} />,
      onClick: () => requestScrollToCard(TRILHO_CARD.estouroPausa),
    },
  ];

  return <FloatingNavSidebar links={links} />;
}
