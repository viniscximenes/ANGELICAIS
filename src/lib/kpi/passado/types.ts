import type { KpiDefinition } from "../types";

/**
 * Valor neutro de KPI (sem status/cor, só valor e definição).
 */
export type NeutralKpiValue = {
  definition: KpiDefinition;
  valor: number | null;
};
