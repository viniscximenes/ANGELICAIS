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

interface KpiMediumCardProps {
  kpi: EnrichedKpiValue | NeutralKpiValue;
  delayIndex: number;
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

function getMetaLabel(kpi: EnrichedKpiValue): string | null {
  const def = kpi.definition;

  switch (def.coloringType) {
    case "binary": {
      if (def.thresholdRed === null) return null;
      const formatted =
        def.valueType === "time"
          ? formatKpiValue(def.thresholdRed, "time")
          : `${def.thresholdRed}${def.valueType === "percent" ? "%" : ""}`;
      const op = def.direction === "lower_better" ? "≤" : "≥";
      return `meta: ${op} ${formatted}`;
    }
    case "per_row": {
      if (kpi.metaPorLinha === null) return null;
      return `meta: ${kpi.metaPorLinha}`;
    }
    case "none":
    case "three_tier":
    default:
      return null;
  }
}

function DefasadosTooltipContent({
  defasados,
}: {
  defasados: DefasadosInfo;
}) {
  return (
    <div className="flex flex-col gap-1 py-0.5" style={{ minWidth: "160px", maxWidth: "220px" }}>
      {defasados.defasados.length === 0 ? (
        <span className="text-xs" style={{ color: "var(--success)" }}>
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
                <span style={{ color: "var(--danger)" }}>{op.valor}</span>
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function KpiMediumCard({
  kpi,
  delayIndex,
  neutral = false,
  defasados,
}: KpiMediumCardProps) {
  const status = "status" in kpi ? kpi.status : undefined;
  const color = neutral ? "var(--muted-foreground)" : getStatusColor(status);
  const isVariation = kpi.definition.valueType === "percent_negative";
  const showMeta = !neutral && "status" in kpi;
  const metaLabel = showMeta ? getMetaLabel(kpi as EnrichedKpiValue) : null;

  const valueColor = neutral
    ? "var(--foreground)"
    : isVariation || status === "neutral"
      ? "var(--foreground)"
      : undefined;

  const cardEl = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.15 + delayIndex * 0.04,
        duration: 0.25,
        ease: EASE_OUT_EXPO,
      }}
      className="elevation-1 relative overflow-hidden rounded-lg p-6 border border-border/50 flex flex-col justify-between min-h-[140px] h-full"
    >
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 h-full w-[3px]"
        style={{
          background:
            neutral || isVariation ? "var(--muted-foreground)" : color,
        }}
      />

      <div>
        <p className="ds-small text-muted-foreground mb-2 tracking-wider">
          {kpi.definition.displayName.toUpperCase()}
        </p>

        <p
          className="ds-display font-semibold"
          style={{
            fontSize: "2.25rem",
            color: valueColor,
          }}
        >
          {formatKpiValue(kpi.valor, kpi.definition.valueType)}
        </p>
      </div>

      {metaLabel && (
        <div className="mt-3 flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full inline-block"
            style={{ backgroundColor: color }}
          />
          <p className="ds-small text-muted-foreground">{metaLabel}</p>
        </div>
      )}
    </motion.div>
  );

  if (!defasados?.temMeta) return cardEl;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="cursor-default h-full">{cardEl}</div>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={6}
        className="flex-col items-start gap-0 p-3 bg-card border border-border text-foreground shadow-xl"
      >
        <DefasadosTooltipContent defasados={defasados} />
      </TooltipContent>
    </Tooltip>
  );
}
