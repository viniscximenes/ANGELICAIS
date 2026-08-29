import type { KpiDefinition } from "../types";

type ParsedRow = {
  cells: string[];
};

export type ParsedClipboard = {
  headers: string[];
  rows: ParsedRow[];
  separator: "TAB" | "VIRGULA";
  rawFirstLineSample: string;
};

type OperatorSnapshot = {
  operatorEmail: string;
  values: Map<string, number | string | null>;
};

export type ExtractionResult = {
  operators: OperatorSnapshot[];
  missingKpis: KpiDefinition[];
  missingMetadata: string[];
  warnings: string[];
};

export const METADATA_SLUGS = {
  gestor: "meta_gestor",
  status: "meta_status",
  monitoria: "meta_monitoria",
  feedbacks: "meta_feedbacks",
  forecastPedidos: "forecast_pedidos",
  forecastChurn: "forecast_churn",
} as const;

export const METADATA_HEADERS = {
  colaborador: ["colaborador", "email", "operador"],
  gestor: ["gestor"],
  status: ["status"],
  monitoria: ["monitorias"],
  feedbacks: ["feedbacks", "feedback"],
  forecastPedidos: ["forecast pedidos mês", "forecast pedidos mes"],
  forecastChurn: ["forecast churn mês", "forecast churn mes"],
} as const;
