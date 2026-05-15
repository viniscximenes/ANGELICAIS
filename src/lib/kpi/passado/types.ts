import type { KpiDefinition } from "../types";

/**
 * Valor neutro de KPI (sem status/cor, só valor e definição).
 */
export type NeutralKpiValue = {
  definition: KpiDefinition;
  valor: number | null;
};

/**
 * Snapshot do operador no mês passado.
 */
export type PreviousMonthSnapshot = {
  hasData: boolean;
  hasAnyDataInBank: boolean;
  mesRef: string;
  dataCorte: string | null;
  kpis: Map<string, NeutralKpiValue>;
};
