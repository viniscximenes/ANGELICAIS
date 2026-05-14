import type { KpiDefinition } from "../types";
import type { EnrichedKpiValue } from "./types";

type Forecasts = {
  forecastPedidos: number | null;
  forecastChurn: number | null;
};

function computeStatus(
  def: KpiDefinition,
  valor: number | null,
  metaPorLinha: number | null,
): EnrichedKpiValue["status"] {
  if (valor === null) return "neutral";

  switch (def.coloringType) {
    case "none":
      return "neutral";

    case "binary": {
      const threshold = def.thresholdRed;
      if (threshold === null) return "neutral";

      if (def.direction === "lower_better") {
        return valor <= threshold ? "success" : "danger";
      }
      if (def.direction === "higher_better") {
        return valor >= threshold ? "success" : "danger";
      }
      return "neutral";
    }

    case "three_tier": {
      const red = def.thresholdRed;
      const yellow = def.thresholdYellow;
      if (red === null || yellow === null) return "neutral";

      if (valor < red) return "danger";
      if (valor < yellow) return "warning";
      return "success";
    }

    case "per_row": {
      if (metaPorLinha === null || metaPorLinha === 0) return "neutral";

      if (def.direction === "higher_better") {
        return valor >= metaPorLinha ? "success" : "danger";
      }
      if (def.direction === "lower_better") {
        return valor <= metaPorLinha ? "success" : "danger";
      }
      return "neutral";
    }

    default:
      return "neutral";
  }
}

export function enrichWithDefinitions(
  definitions: KpiDefinition[],
  valuesBySlug: Map<string, number | null>,
  forecasts: Forecasts,
): Map<string, EnrichedKpiValue> {
  const result = new Map<string, EnrichedKpiValue>();

  for (const def of definitions) {
    if (def.groupType !== "principal") continue;

    const valor = valuesBySlug.get(def.slug) ?? null;

    let metaPorLinha: number | null = null;
    if (def.slug === "pedidos") metaPorLinha = forecasts.forecastPedidos;
    if (def.slug === "churn") metaPorLinha = forecasts.forecastChurn;

    const status = computeStatus(def, valor, metaPorLinha);

    result.set(def.slug, {
      definition: def,
      valor,
      metaPorLinha,
      status,
    });
  }

  return result;
}
