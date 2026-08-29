"use client";

import { useEffect, useState } from "react";

import { resolverTokenCss } from "@/lib/utils/resolver-token-css";

export type ChartColors = {
  success: string;
  danger: string;
  warning: string;
  border: string;
  mutedFg: string;
  background: string;
};

const FALLBACK: ChartColors = {
  success: "#16a34a",
  danger: "#dc2626",
  warning: "#d97706",
  border: "#3f3f46",
  mutedFg: "#71717a",
  background: "#0a0a0a",
};

/**
 * Cores do tema atual já RESOLVIDAS (valor computado, não `var(--x)`) — os
 * gráficos deste relatório são serializados isoladamente num <img> pela
 * exportação PNG/PDF, e `var()` não resolve dentro do SVG nesse contexto
 * (mesmo motivo do tratamento em retencao/operador-detalhe-dialog.tsx).
 * Use estas cores em TODA cor passada ao Recharts (stroke, fill, <stop>).
 */
export function useChartColors(): ChartColors {
  const [cores, setCores] = useState<ChartColors>(FALLBACK);

  useEffect(() => {
    setCores({
      success: resolverTokenCss("--success", FALLBACK.success),
      danger: resolverTokenCss("--danger", FALLBACK.danger),
      warning: resolverTokenCss("--warning", FALLBACK.warning),
      border: resolverTokenCss("--border", FALLBACK.border),
      mutedFg: resolverTokenCss("--muted-foreground", FALLBACK.mutedFg),
      background: resolverTokenCss("--background", FALLBACK.background),
    });
  }, []);

  return cores;
}
