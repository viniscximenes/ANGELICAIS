"use client";

import { motion } from "framer-motion";

import { formatKpiValue } from "@/lib/kpi/atual/format-kpi-value";
import type { EnrichedKpiValue } from "@/lib/kpi/atual/types";
import type { NeutralKpiValue } from "@/lib/kpi/passado/types";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface KpiMediumCardProps {
  kpi: EnrichedKpiValue | NeutralKpiValue;
  delayIndex: number;
  neutral?: boolean;
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

export function KpiMediumCard({
  kpi,
  delayIndex,
  neutral = false,
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.15 + delayIndex * 0.04,
        duration: 0.25,
        ease: EASE_OUT_EXPO,
      }}
      className="elevation-1 relative overflow-hidden rounded-lg p-6 border border-border/50"
    >
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 h-full w-[3px]"
        style={{
          background:
            neutral || isVariation ? "var(--muted-foreground)" : color,
        }}
      />

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
}
