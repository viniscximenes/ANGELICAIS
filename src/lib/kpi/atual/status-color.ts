import type { CSSProperties } from "react";

import type { EnrichedKpiValue } from "./types";

export type KpiStatus = EnrichedKpiValue["status"];

/**
 * Nome da CSS var de status de um KPI — ou `null` quando não há cor a
 * aplicar (status neutro, valor nulo, ou mês passado, que nunca colore).
 *
 * Fonte única da coloração das células de KPI. Usado pela tabela de
 * /kpi/operadores (KpiEquipeSection) e pela tabela de /operacao/kpi-detalhado.
 */
export function statusColorVar(
  status: KpiStatus,
  valorIsNull: boolean,
  isMesPassado = false,
): string | null {
  if (isMesPassado || status === "neutral" || valorIsNull) return null;
  if (status === "success") return "--success";
  if (status === "warning") return "--warning";
  return "--danger";
}

/** Estilo inline da célula (cor do texto + peso) conforme o status. */
export function celulaStyle(
  status: KpiStatus,
  valorIsNull: boolean,
  isMesPassado = false,
): CSSProperties {
  const v = statusColorVar(status, valorIsNull, isMesPassado);
  if (!v) return {};
  return { color: `var(${v})`, fontWeight: 600 };
}
