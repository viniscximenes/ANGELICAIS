"use client";

import type { KpiGestorCardSerial } from "@/lib/kpi/gestor/build-kpi-gestor-cards";
import type { DefasadoGestorInfo } from "@/lib/kpi/gestor/get-defasados-gestor-por-kpi";
import { cn } from "@/lib/utils";

interface KpiGestorCardProps {
  card: KpiGestorCardSerial;
  isHovered: boolean;
  isDimmed: boolean;
  /** Painel flutuante deste card está fixo aberto (clique/Enter) — ver kpi-gestor-section.tsx. */
  isPinned: boolean;
  /** Card tem painel pra abrir (dado presente e, se aplicável, meta configurada) — controla os atributos de acessibilidade do trigger. */
  temPainel: boolean;
  /** Só aplica a cor semântica de meta (verde/vermelho) quando true — Mês Atual. */
  isMesAtual: boolean;
  onHover: (slug: string, event: React.MouseEvent<HTMLDivElement>) => void;
  /** Mouse saiu do card — pode ser em direção ao painel (ver handlePanelEnter em kpi-gestor-section.tsx), por isso recebe o slug e não fecha na hora. */
  onLeave: (slug: string) => void;
  /** Clique ou Enter/Espaço — fixa (ou desfixa, se já fixo) o painel deste card. */
  onOpen: (slug: string, event: React.SyntheticEvent<HTMLDivElement>) => void;
}

function getStatusColor(status: "success" | "danger" | null): string {
  switch (status) {
    case "success":
      return "var(--success)";
    case "danger":
      return "var(--danger)";
    default:
      return "var(--muted-foreground)";
  }
}

function CardBody({
  card,
  isMesAtual,
}: {
  card: KpiGestorCardSerial;
  isMesAtual: boolean;
}) {
  // Fora do Mês Atual, a cor de status (verde/vermelho) some — os cards
  // caem no neutro (--foreground/--muted-foreground) mesmo que o valor
  // daquele período esteja acima ou abaixo da meta.
  const status = isMesAtual ? card.status : null;
  const color = getStatusColor(status);
  const valueColor = status ? color : card.temDado ? "var(--foreground)" : "var(--muted-foreground)";

  return (
    // Sem animação de entrada (pedido explícito): loading → card já na tela,
    // tanto no F5 quanto na troca de mês.
    <div
      className="kpi-gestor-card relative overflow-hidden rounded-lg p-6 flex flex-col justify-between min-h-[140px] h-full bg-card/70 border border-border shadow-[var(--shadow-sm)] backdrop-blur-md"
    >
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 h-full w-[3px]"
        style={{
          background: color,
        }}
      />

      <div>
        <p
          className="ds-small text-muted-foreground mb-2 tracking-wider uppercase truncate"
          title={card.label}
        >
          {card.label}
        </p>

        <p
          className="ds-display font-semibold"
          style={{
            fontSize: "2.25rem",
            color: valueColor,
          }}
        >
          {card.valorFormatado}
        </p>
      </div>

      {card.metaCondicao && (
        <div className="mt-3 flex items-center">
          <p className="ds-small text-muted-foreground">meta: {card.metaCondicao}</p>
        </div>
      )}
    </div>
  );
}

/** Conteúdo do painel flutuante único (renderizado pelo KpiGestorSection no hover). */
export function DefasadosTooltipContent({
  defasado,
  card,
}: {
  defasado: DefasadoGestorInfo;
  card: KpiGestorCardSerial;
}) {
  const foraCount = defasado.defasados.length;

  return (
    <div>
      {/*
        pr-4 só no título/subtítulo (não no painel inteiro) — dá clearance
        pro botão × (absolute top-2.5 right-2.5, size-6) sem empurrar a
        lista/scrollbar pra longe da borda direita do painel. O padding do
        painel (p-5) já é igual nos 4 lados; só a lista tem mais 4px de
        respiro próprio (pr-1) pra escala não encostar no texto.
      */}
      <p className="text-sm font-semibold mb-1 pr-4">
        {card.label} {card.metaCondicao}
      </p>
      <p className="text-xs text-muted-foreground mb-3 pb-2 border-b border-border">
        {foraCount} de {defasado.totalOperadores} fora da meta
      </p>

      {foraCount === 0 ? (
        <p className="text-sm text-muted-foreground">
          {defasado.totalOperadores > 0
            ? "Todos os operadores dentro da meta"
            : "Nenhum operador com dado neste mês"}
        </p>
      ) : (
        // overscroll-contain: sem isso, ao chegar no fim da lista o resto do
        // gesto de rolagem (wheel/touch) "vaza" pra rolar a PÁGINA por trás
        // (scroll chaining nativo do navegador) — o que fecharia o painel
        // (kpi-gestor-section.tsx fecha ao detectar scroll da página).
        // Confirmado via Playwright: sem isso, rolar até o fim de uma lista
        // longa fechava o painel no meio da leitura.
        <div className="space-y-2 max-h-[350px] overflow-y-auto overscroll-contain pr-1 scrollbar-tema">
          {defasado.defasados.map((op) => (
            <div key={op.user} className="flex justify-between gap-3">
              <span className="text-sm text-foreground truncate">{op.user}</span>
              <span className="text-sm font-medium text-foreground shrink-0">{op.valor}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Conteúdo do painel flutuante pra card sem dado no mês (kpi_gestor_snapshots sem linha). */
export function SemDadoTooltipContent({ card }: { card: KpiGestorCardSerial }) {
  return (
    <div>
      {/* pr-4: mesmo motivo do título em DefasadosTooltipContent — clearance pro botão ×. */}
      <p className="text-sm font-semibold mb-1 pr-4">{card.label}</p>
      <p className="text-sm text-muted-foreground">Dados não disponíveis para este indicador</p>
    </div>
  );
}

/**
 * Card de KPI do gestor. Sem Popover/portal próprios — hover/clique só
 * reportam o slug pro KpiGestorSection, que decide dim/painel pra todos os
 * cards de uma vez (ver painel flutuante único em kpi-gestor-section.tsx).
 *
 * Duas formas de abrir o painel de detalhes:
 * - Hover: abre ao passar o mouse, e continua aberto — interativo, dá pra
 *   rolar a lista — enquanto o mouse estiver sobre o card OU sobre o
 *   próprio painel (o painel tem seus próprios onMouseEnter/Leave, ver
 *   kpi-gestor-section.tsx). Só fecha, com um pequeno atraso, quando o
 *   mouse sai dos dois de vez.
 * - Clique (ou Enter/Espaço, com foco no card): FIXA o painel aberto
 *   indefinidamente, sem depender do mouse — essencial pra touch (sem
 *   hover) e teclado. Fecha só com um gesto explícito (botão ×, Esc,
 *   clique fora ou clique de novo no card).
 */
export function KpiGestorCard({
  card,
  isHovered,
  isDimmed,
  isPinned,
  temPainel,
  isMesAtual,
  onHover,
  onLeave,
  onOpen,
}: KpiGestorCardProps) {
  return (
    <div
      data-kpi-gestor-card={card.configSlug}
      role={temPainel ? "button" : undefined}
      tabIndex={temPainel ? 0 : undefined}
      aria-haspopup={temPainel ? "dialog" : undefined}
      aria-expanded={temPainel ? isPinned : undefined}
      // Sem painel (sem lista de operadores): card estático no hover — não
      // ativa o desfoque dos demais nem o leve aumento de escala.
      onMouseEnter={temPainel ? (event) => onHover(card.configSlug, event) : undefined}
      onMouseLeave={temPainel ? () => onLeave(card.configSlug) : undefined}
      onClick={temPainel ? (event) => onOpen(card.configSlug, event) : undefined}
      onKeyDown={
        temPainel
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpen(card.configSlug, event);
              }
            }
          : undefined
      }
      className={cn(
        "h-full transition-all duration-200",
        isDimmed && "opacity-30 blur-[1px]",
        isHovered && "relative z-10 scale-[1.02]",
        temPainel &&
          "cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] rounded-lg",
        isPinned && "relative z-10",
      )}
    >
      <CardBody card={card} isMesAtual={isMesAtual} />
    </div>
  );
}
