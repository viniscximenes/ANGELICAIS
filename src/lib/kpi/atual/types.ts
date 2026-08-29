import type { KpiDefinition } from "../types";

/**
 * Valor de um KPI para um operador, já enriquecido com a definição.
 */
export type EnrichedKpiValue = {
  definition: KpiDefinition;
  valor: number | null;
  metaPorLinha: number | null;
  status: "success" | "warning" | "danger" | "neutral";
};
