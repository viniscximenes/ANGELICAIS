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

/**
 * Snapshot completo do operador no mês corrente, com todos os KPIs principais.
 */
export type CurrentMonthSnapshot = {
  hasData: boolean;
  mesRef: string;
  dataCorte: string | null;
  updatedAt: string | null;
  kpis: Map<string, EnrichedKpiValue>;
};
