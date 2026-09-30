import type { CSSProperties } from "react";

import {
  celulaStyle as celulaStyleShared,
  statusColorVar as statusColorVarShared,
  type KpiStatus,
} from "@/lib/kpi/atual/status-color";

/**
 * Apresentação da célula de KPI nesta tabela — reaproveita status-color.ts
 * (fonte única da COR/lógica de status, compartilhada com
 * /kpi/detalhado-polo) sem alterá-lo, e adiciona só o que é exclusivo
 * do redesign desta rota: fundo sutil pra "danger" e um rótulo sr-only pra
 * status não depender só de cor.
 */
export interface CelulaApresentacao {
  style: CSSProperties;
  /** null quando não há status colorido (neutral, valor nulo, mês passado). */
  srOnlyLabel: string | null;
}

const SR_LABEL_POR_STATUS: Record<"success" | "warning" | "danger", string> = {
  success: "acima da meta",
  warning: "atenção",
  danger: "abaixo da meta",
};

export function celulaApresentacao(
  status: KpiStatus,
  valorIsNull: boolean,
  isMesPassado: boolean,
): CelulaApresentacao {
  const varName = statusColorVarShared(status, valorIsNull, isMesPassado);
  const style = celulaStyleShared(status, valorIsNull, isMesPassado);

  if (varName === "--danger") {
    style.backgroundColor = "color-mix(in srgb, var(--danger) 8%, transparent)";
  }

  const srOnlyLabel =
    varName && (status === "success" || status === "warning" || status === "danger")
      ? SR_LABEL_POR_STATUS[status]
      : null;

  return { style, srOnlyLabel };
}
