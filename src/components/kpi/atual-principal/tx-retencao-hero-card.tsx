"use client";

import { motion } from "framer-motion";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatKpiValue } from "@/lib/kpi/atual/format-kpi-value";
import type { EnrichedKpiValue } from "@/lib/kpi/atual/types";
import type { DefasadosInfo } from "@/lib/kpi/gestor/gestor-proprio-types";
import type { NeutralKpiValue } from "@/lib/kpi/passado/types";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface TxRetencaoHeroCardProps {
  kpi: EnrichedKpiValue | NeutralKpiValue;
  neutral?: boolean;
  defasados?: DefasadosInfo;
}

function getStatusColor(status: string | undefined): string {
  switch (status) {
    case "success":
      return "var(--success)";
    case "warning":
      return "var(--warning)";
    case "danger":
      return "var(--danger)";
    default:
      return "var(--muted-foreground)";
  }
}

function getMetaLabel(kpi: EnrichedKpiValue): string {
  const def = kpi.definition;
  
  if (def.coloringType === "binary") {
    if (def.thresholdRed === null) return "";
    const formatted =
      def.valueType === "time"
        ? formatKpiValue(def.thresholdRed, "time")
        : `${def.thresholdRed}${def.valueType === "percent" ? "%" : ""}`;
    const op = def.direction === "lower_better" ? "≤" : "≥";
    return `meta: ${op} ${formatted}`;
  }
  
  if (def.coloringType === "three_tier") {
    if (def.thresholdRed === null || def.thresholdYellow === null) return "";
    return `meta: ≥ ${def.thresholdYellow}% (verde) • ${def.thresholdRed}–${def.thresholdYellow}% (amarelo)`;
  }

  if (def.coloringType === "per_row") {
    if (kpi.metaPorLinha === null) return "";
    return `meta: ${kpi.metaPorLinha}`;
  }

  return "";
}

function DefasadosTooltipContent({
  defasados,
}: {
  defasados: DefasadosInfo;
}) {
  return (
    <div className="flex flex-col gap-1 py-0.5" style={{ minWidth: "160px", maxWidth: "220px" }}>
      {defasados.defasados.length === 0 ? (
        <span className="text-xs text-muted-foreground">
          Nenhum operador defasado
        </span>
      ) : (
        <>
          <p className="text-[10px] uppercase tracking-wider opacity-60 mb-0.5 text-muted-foreground">
            Operadores defasados
          </p>
          <div
            className="flex flex-col gap-0.5 overflow-y-auto scrollbar-tema pr-1"
            style={{ maxHeight: "160px" }}
          >
            {defasados.defasados.map((op) => (
              <span key={op.user} className="font-mono text-xs leading-snug text-foreground">
                {op.user}
                <span className="opacity-60"> · </span>
                <span className="text-foreground">{op.valor}</span>
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function TxRetencaoHeroCard({
  kpi,
  neutral = false,
  defasados,
}: TxRetencaoHeroCardProps) {
  const status = "status" in kpi ? kpi.status : undefined;
  const color = neutral ? "var(--muted-foreground)" : getStatusColor(status);
  const textColor = neutral ? "var(--foreground)" : color;
  const showBar = neutral || (status && status !== "neutral");
  const showMeta = !neutral && "status" in kpi;
  const isPercent = kpi.definition.valueType === "percent";
  const isPercentNeg = kpi.definition.valueType === "percent_negative";

  const renderValue = () => {
    if (kpi.valor === null) {
      return (
        <span className="ds-display" style={{ color: "var(--muted-foreground)" }}>
          —
        </span>
      );
    }
    
    if (isPercent) {
      return (
        <>
          <span className="ds-display font-semibold" style={{ color: textColor }}>
            {kpi.valor.toFixed(1)}
          </span>
          <span
            className="ds-display font-semibold"
            style={{
              color: `color-mix(in oklch, ${textColor} 60%, transparent)`,
              fontSize: "60%",
              marginLeft: "0.1em",
            }}
          >
            %
          </span>
        </>
      );
    }

    if (isPercentNeg) {
      const absVal = Math.abs(kpi.valor).toFixed(1);
      const sign = kpi.valor < 0 ? "-" : "+";
      return (
        <>
          <span className="ds-display font-semibold" style={{ color: textColor }}>
            {sign}{absVal}
          </span>
          <span
            className="ds-display font-semibold"
            style={{
              color: `color-mix(in oklch, ${textColor} 60%, transparent)`,
              fontSize: "60%",
              marginLeft: "0.1em",
            }}
          >
            %
          </span>
        </>
      );
    }

    return (
      <span className="ds-display font-semibold" style={{ color: textColor }}>
        {formatKpiValue(kpi.valor, kpi.definition.valueType)}
      </span>
    );
  };

  const cardEl = (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1, duration: 0.3, ease: EASE_OUT_EXPO }}
      className="relative overflow-hidden rounded-xl p-6 text-center lg:p-8 bg-zinc-800/45 border border-white/10 backdrop-blur-md"
      style={{
        boxShadow: `0 20px 25px -5px rgb(0 0 0 / 0.5)`,
      }}
    >
      {showBar && (
        <div
          aria-hidden="true"
          className="absolute top-0 right-0 left-0 h-[3px]"
          style={{
            background: `linear-gradient(to right, transparent 0%, ${color} 50%, transparent 100%)`,
            filter: `drop-shadow(0 1px 2px ${color}40)`,
          }}
        />
      )}

      <p className="ds-small text-muted-foreground mb-3 tracking-wider">
        {kpi.definition.displayName.toUpperCase()}
      </p>

      <div className="flex items-baseline justify-center">
        {renderValue()}
      </div>

      {showMeta && getMetaLabel(kpi as EnrichedKpiValue) !== "" && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <span
            className="w-2 h-2 rounded-full inline-block animate-pulse"
            style={{ backgroundColor: color }}
          />
          <p className="ds-mono-sm text-muted-foreground">
            {getMetaLabel(kpi as EnrichedKpiValue)}
          </p>
        </div>
      )}
    </motion.div>
  );

  if (!defasados?.temMeta) return cardEl;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="cursor-default">{cardEl}</div>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        sideOffset={6}
        className="flex-col items-start gap-0 p-3 bg-card border border-border text-foreground shadow-xl"
      >
        <DefasadosTooltipContent defasados={defasados} />
      </TooltipContent>
    </Tooltip>
  );
}
