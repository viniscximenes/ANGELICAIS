"use client";

import { useEffect, useState, type ReactNode } from "react";
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
import { getLenisInstance } from "@/lib/lenis/lenis-instance";
import { requestScrollToCard } from "@/lib/retencao/scroll-to-card-event";
import { FloatingNavSidebar } from "@/components/ui/floating-nav-sidebar";

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

// Antes: "text-neutral-700 dark:text-neutral-200" — cinza hardcoded fora do
// tema (o projeto não usa a estratégia `.dark` do Tailwind, então o
// `dark:` nunca disparava; o ícone ficava sempre no mesmo cinza médio,
// independente do tema claro/escuro ativo). Agora lê --muted-foreground do
// escopo [data-page="reports-consolidado"] (herdado via wrapperClassName/
// dataPage em FloatingNavSidebar — ver comentário lá).
const ICON_CLASS = "h-5 w-5 shrink-0";

/** Seção visível agora: "equipe" (tabela do topo) ou o índice do card do trilho. */
type Ativo = "equipe" | number;

/**
 * Descobre a seção visível acompanhando a rolagem:
 * - enquanto a tabela de operadores ocupa boa parte da tela (o fundo dela
 *   ainda abaixo de 35% da altura da janela) → "equipe";
 * - depois disso, o card do trilho horizontal cuja borda esquerda está mais
 *   perto da borda esquerda da área do trilho (é o que está "na frente",
 *   já que o trilho desliza pra esquerda conforme a página rola).
 * Lê só posições do DOM (#equipe-section, #trilho-card-N) — não mexe no
 * trilho nem nos cálculos de pin/snap dele. rAF evita medir mais de uma
 * vez por frame.
 */
function useSecaoAtiva(): Ativo {
  const [ativo, setAtivo] = useState<Ativo>("equipe");

  useEffect(() => {
    let raf = 0;
    function medir() {
      raf = 0;
      const equipe = document.getElementById("equipe-section");
      if (equipe && equipe.getBoundingClientRect().bottom > window.innerHeight * 0.35) {
        setAtivo("equipe");
        return;
      }
      const primeiro = document.getElementById("trilho-card-0");
      const area = primeiro?.parentElement?.parentElement;
      if (!primeiro || !area) return;
      const esquerdaArea = area.getBoundingClientRect().left;
      let melhor = 0;
      let menorDistancia = Infinity;
      for (let i = 0; ; i++) {
        const card = document.getElementById(`trilho-card-${i}`);
        if (!card) break;
        const distancia = Math.abs(card.getBoundingClientRect().left - esquerdaArea);
        if (distancia < menorDistancia) {
          menorDistancia = distancia;
          melhor = i;
        }
      }
      setAtivo(melhor);
    }
    function agendar() {
      if (!raf) raf = requestAnimationFrame(medir);
    }
    agendar();
    window.addEventListener("scroll", agendar, { passive: true });
    window.addEventListener("resize", agendar);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", agendar);
      window.removeEventListener("resize", agendar);
    };
  }, []);

  return ativo;
}

/**
 * Caixa de largura fixa do ícone (todos os textos começam no mesmo ponto) +
 * marcador do item ativo: tracinho vertical à esquerda, no estilo das
 * cantoneiras dos cards. Cores em reports-consolidado.css
 * (.reports-consolidado-nav [data-nav-ativo]).
 */
function IconeNav({ ativo, children }: { ativo: boolean; children: ReactNode }) {
  return (
    <span data-nav-icone data-nav-ativo={ativo || undefined} className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
      <span aria-hidden="true" data-nav-marcador className="absolute top-0.5 -left-2.5 h-4 w-0.5 rounded-full" />
      {children}
    </span>
  );
}

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
  const ativo = useSecaoAtiva();

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
        <IconeNav ativo={ativo === "equipe"}>
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
      links={links}
      wrapperClassName="reports-consolidado-nav"
      dataPage="reports-consolidado"
      // Divisória entre a tabela do topo e os slides do Analítico.
      divisoriasApos={[0]}
    />
  );
}
