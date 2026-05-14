"use client";

import { motion } from "framer-motion";

import type { EnrichedKpiValue } from "@/lib/kpi/atual/types";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface TxRetencaoHeroCardProps {
  kpi: EnrichedKpiValue;
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

function getMetaLabel(kpi: EnrichedKpiValue): string {
  const def = kpi.definition;
  if (def.thresholdRed === null || def.thresholdYellow === null) return "";
  return `meta: ≥ ${def.thresholdYellow}% (verde) • ${def.thresholdRed}–${def.thresholdYellow}% (amarelo)`;
}

export function TxRetencaoHeroCard({ kpi }: TxRetencaoHeroCardProps) {
  const color = getStatusColor(kpi.status);
  const isNeutral = kpi.status === "neutral";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2, duration: 0.6, ease: EASE_OUT_EXPO }}
      className="elevation-2 relative overflow-hidden rounded-xl p-6 text-center lg:p-8"
    >
      {!isNeutral && (
        <div
          aria-hidden="true"
          className="absolute top-0 right-0 left-0 h-[2px]"
          style={{
            background: `linear-gradient(to right, transparent 0%, ${color} 50%, transparent 100%)`,
          }}
        />
      )}

      <p className="ds-small text-muted-foreground mb-3 tracking-wider">
        TX RETENÇÃO BRUTA
      </p>

      <div className="flex items-baseline justify-center">
        {kpi.valor === null ? (
          <span
            className="ds-display"
            style={{ color: "var(--muted-foreground)" }}
          >
            —
          </span>
        ) : (
          <>
            <span className="ds-display" style={{ color }}>
              {kpi.valor.toFixed(1)}
            </span>
            <span
              className="ds-display"
              style={{
                color: `color-mix(in oklch, ${color} 60%, transparent)`,
                fontSize: "60%",
                marginLeft: "0.1em",
              }}
            >
              %
            </span>
          </>
        )}
      </div>

      <p className="ds-mono-sm text-muted-foreground mt-2">
        {getMetaLabel(kpi)}
      </p>
    </motion.div>
  );
}
