"use client";

import {
  IconUsersGroup,
  IconChartLine,
  IconTags,
  IconAward,
  IconChartPie,
  IconCopy,
  IconFaceId,
  IconTargetArrow,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { getLenisInstance } from "@/lib/lenis/lenis-instance";
import { onTrilhoDisponivel, requestScrollToCard } from "@/lib/retencao/scroll-to-card-event";
import { FloatingNavSidebar } from "@/components/ui/floating-nav-sidebar";
import { IconeNav, useSecaoAtiva } from "@/components/gestor/nav-secao-ativa";

/**
 * Índices dos cards no trilho horizontal — precisam bater com a ordem real
 * do array `slides` em retencao-detalhe-section.tsx:
 * 0 = visão geral + evolução, 1 = retenção por tema, 2 = divisor de quartil,
 * 3 = desempenho por segmento, 4 = copiar contratos, 5 = impacto FaceID,
 * 6 = efetividade por argumento.
 */
const TRILHO_CARD = {
  visaoGeral: 0,
  temas: 1,
  quartis: 2,
  segmentos: 3,
  contratos: 4,
  impactoFaceId: 5,
  efetividadeArgumento: 6,
} as const;

// Só tamanho: a cor do ícone (--muted-foreground / --foreground no ativo)
// vem de globals.css (.nav-secoes [data-nav-icone]).
const ICON_CLASS = "h-5 w-5 shrink-0";

/**
 * Navegação lateral animada (hover expande 60px → 300px, padrão Aceternity —
 * ver @/components/ui/hover-sidebar), EXCLUSIVA de /s/reports/consolidado.
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
 *
 * A casca (wrapper fixed + Sidebar/SidebarBody/loop) foi extraída pra
 * FloatingNavSidebar — reaproveitada também por TempoIndispNavSidebar, sem
 * duplicar essa lógica. Este componente só monta a lista de itens
 * específica do consolidado, IDÊNTICA à de antes da extração.
 */
export function ConsolidadoNavSidebar() {
  const ativo = useSecaoAtiva("equipe-section");

  // Cards do Analítico existem? (RetencaoDetalheSection avisa.) Começa em
  // false: o trilho só aparece depois da busca client-side do Analítico.
  const [trilhoDisponivel, setTrilhoDisponivel] = useState(false);
  useEffect(() => onTrilhoDisponivel(setTrilhoDisponivel), []);

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
      label: "Taxa de retenção por tema",
      href: "#trilho-card-1",
      icon: (
        <IconeNav ativo={ativo === TRILHO_CARD.temas}>
          <IconTags className={ICON_CLASS} />
        </IconeNav>
      ),
      onClick: () => requestScrollToCard(TRILHO_CARD.temas),
    },
    {
      label: "Divisor de quartil",
      href: "#trilho-card-2",
      icon: (
        <IconeNav ativo={ativo === TRILHO_CARD.quartis}>
          <IconAward className={ICON_CLASS} />
        </IconeNav>
      ),
      onClick: () => requestScrollToCard(TRILHO_CARD.quartis),
    },
    {
      label: "Taxa por marca e regional",
      href: "#trilho-card-3",
      icon: (
        <IconeNav ativo={ativo === TRILHO_CARD.segmentos}>
          <IconChartPie className={ICON_CLASS} />
        </IconeNav>
      ),
      onClick: () => requestScrollToCard(TRILHO_CARD.segmentos),
    },
    {
      label: "Copiar contratos do AIR",
      href: "#trilho-card-4",
      icon: (
        <IconeNav ativo={ativo === TRILHO_CARD.contratos}>
          <IconCopy className={ICON_CLASS} />
        </IconeNav>
      ),
      onClick: () => requestScrollToCard(TRILHO_CARD.contratos),
    },
    {
      label: "Impacto do face ID",
      href: "#trilho-card-5",
      icon: (
        <IconeNav ativo={ativo === TRILHO_CARD.impactoFaceId}>
          <IconFaceId className={ICON_CLASS} />
        </IconeNav>
      ),
      onClick: () => requestScrollToCard(TRILHO_CARD.impactoFaceId),
    },
    {
      label: "Taxa por cada perfilação",
      href: "#trilho-card-6",
      icon: (
        <IconeNav ativo={ativo === TRILHO_CARD.efetividadeArgumento}>
          <IconTargetArrow className={ICON_CLASS} />
        </IconeNav>
      ),
      onClick: () => requestScrollToCard(TRILHO_CARD.efetividadeArgumento),
    },
  ];

  return (
    <FloatingNavSidebar
      // Item 0 (tabela) sempre funciona; os do trilho ficam apagados e sem
      // clique enquanto o Analítico carrega, está vazio ou deu erro.
      links={links.map((link, i) => (i === 0 ? link : { ...link, desabilitado: !trilhoDisponivel }))}
      wrapperClassName="nav-secoes"
      dataPage="reports-consolidado"
      // Divisória entre a tabela do topo e os slides do Analítico.
      divisoriasApos={[0]}
    />
  );
}
