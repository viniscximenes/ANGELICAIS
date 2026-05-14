"use client";

import { motion } from "framer-motion";

import { formatKpiValue } from "@/lib/kpi/atual/format-kpi-value";
import type { EnrichedKpiValue } from "@/lib/kpi/atual/types";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface KpiMediumCardProps {
  kpi: EnrichedKpiValue;
  delayIndex: number;
}

function getStatusColor(status: EnrichedKpiValue["status"]): string {
  switch (status) {
    case "success":
      return "var(--success)";
    case "warning":
      return "var(--warning)";
    case "danger":
      return "var(--danger)";
    case "neutral":
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

export function KpiMediumCard({ kpi, delayIndex }: KpiMediumCardProps) {
  const color = getStatusColor(kpi.status);
  const isNeutral = kpi.status === "neutral";
  const metaLabel = getMetaLabel(kpi);
  const isVariation = kpi.definition.valueType === "percent_negative";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.35 + delayIndex * 0.08,
        duration: 0.5,
        ease: EASE_OUT_EXPO,
      }}
      className="elevation-1 relative overflow-hidden rounded-lg p-6"
    >
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 h-full w-[3px]"
        style={{
          background: isVariation ? "var(--muted-foreground)" : color,
        }}
      />

      <p className="ds-small text-muted-foreground mb-2 tracking-wider">
        {kpi.definition.displayName.toUpperCase()}
      </p>

      <p
        className="ds-display"
        style={{
          fontSize: "2.25rem",
          color: isVariation || isNeutral ? "var(--foreground)" : undefined,
        }}
      >
        {formatKpiValue(kpi.valor, kpi.definition.valueType)}
      </p>

      {metaLabel && (
        <p className="ds-mono-sm text-muted-foreground mt-2">{metaLabel}</p>
      )}
    </motion.div>
  );
}
