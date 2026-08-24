"use client";

import { motion } from "framer-motion";

import type { KpiGestorCardSerial } from "@/lib/kpi/gestor/build-kpi-gestor-cards";
import type { DefasadoGestorInfo } from "@/lib/kpi/gestor/get-defasados-gestor-por-kpi";
import { cn } from "@/lib/utils";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface KpiGestorCardProps {
  card: KpiGestorCardSerial;
  delayIndex: number;
  isHovered: boolean;
  isDimmed: boolean;
  /** Só aplica a cor semântica de meta (verde/vermelho) quando true — Mês Atual. */
  isMesAtual: boolean;
  onHover: (slug: string, event: React.MouseEvent<HTMLDivElement>) => void;
  onLeave: () => void;
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
  delayIndex,
  isMesAtual,
}: {
  card: KpiGestorCardSerial;
  delayIndex: number;
  isMesAtual: boolean;
}) {
  // Fora do Mês Atual, a cor de status (verde/vermelho) some — os cards
  // caem no neutro (--foreground/--muted-foreground) mesmo que o valor
  // daquele período esteja acima ou abaixo da meta.
  const status = isMesAtual ? card.status : null;
  const color = getStatusColor(status);
  const valueColor = status ? color : card.temDado ? "var(--foreground)" : "var(--muted-foreground)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.15 + delayIndex * 0.04,
        duration: 0.25,
        ease: EASE_OUT_EXPO,
      }}
      className="relative overflow-hidden rounded-lg p-6 flex flex-col justify-between min-h-[140px] h-full bg-card border border-border shadow-[var(--shadow-sm)] backdrop-blur-md dark:bg-zinc-800/45 dark:border-white/10 dark:shadow-[0_10px_15px_-3px_rgb(0_0_0_/_0.3)]"
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
    </motion.div>
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
      <p className="text-sm font-semibold mb-1">
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
        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 scrollbar-tema">
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
      <p className="text-sm font-semibold mb-1">{card.label}</p>
      <p className="text-sm text-muted-foreground">Dados não disponíveis para este indicador</p>
    </div>
  );
}

/**
 * Card de KPI do gestor. Sem Popover/portal próprios — o hover só reporta
 * o slug pro KpiGestorSection, que decide dim/tooltip pra todos os cards
 * de uma vez (ver painel flutuante único em kpi-gestor-section.tsx).
 */
export function KpiGestorCard({
  card,
  delayIndex,
  isHovered,
  isDimmed,
  isMesAtual,
  onHover,
  onLeave,
}: KpiGestorCardProps) {
  return (
    <div
      onMouseEnter={(event) => onHover(card.configSlug, event)}
      onMouseLeave={onLeave}
      className={cn(
        "h-full transition-all duration-200",
        isDimmed && "opacity-30 blur-[1px]",
        isHovered && "relative z-10 scale-[1.02]",
      )}
    >
      <CardBody card={card} delayIndex={delayIndex} isMesAtual={isMesAtual} />
    </div>
  );
}
