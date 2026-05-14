import type { KpiDefinition } from "../types";
import type { EnrichedKpiValue } from "./types";

type ExtraContext = {
  forecastPedidos: number | null;
  forecastChurn: number | null;
  txRetencaoBruta: number | null;
};

function computeStatus(
  def: KpiDefinition,
  valor: number | null,
  context: { metaPorLinha: number | null; txRetencaoBruta: number | null },
): EnrichedKpiValue["status"] {
  if (valor === null) return "neutral";

  if (
    def.thresholdDiffPercent !== null &&
    def.thresholdDiffPercent !== undefined
  ) {
    if (context.txRetencaoBruta === null) return "neutral";
    const diff = context.txRetencaoBruta - valor;
    return diff <= def.thresholdDiffPercent ? "success" : "danger";
  }

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
      if (context.metaPorLinha === null || context.metaPorLinha === 0)
        return "neutral";

      if (def.direction === "higher_better") {
        return valor >= context.metaPorLinha ? "success" : "danger";
      }
      if (def.direction === "lower_better") {
        return valor <= context.metaPorLinha ? "success" : "danger";
      }
      return "neutral";
    }

    default:
      return "neutral";
  }
}

/**
 * Junta valores do snapshot com as definições, calculando status.
 * `filterByGroup` filtra só os KPIs principais ou só os secundários.
 */
export function enrichWithDefinitions(
  definitions: KpiDefinition[],
  valuesBySlug: Map<string, number | null>,
  extra: ExtraContext,
  filterByGroup: "principal" | "secundario",
): Map<string, EnrichedKpiValue> {
  const result = new Map<string, EnrichedKpiValue>();

  for (const def of definitions) {
    if (def.groupType !== filterByGroup) continue;

    const valor = valuesBySlug.get(def.slug) ?? null;

    let metaPorLinha: number | null = null;
    if (def.slug === "pedidos") metaPorLinha = extra.forecastPedidos;
    if (def.slug === "churn") metaPorLinha = extra.forecastChurn;

    const status = computeStatus(def, valor, {
      metaPorLinha,
      txRetencaoBruta: extra.txRetencaoBruta,
    });

    result.set(def.slug, {
      definition: def,
      valor,
      metaPorLinha,
      status,
    });
  }

  return result;
}
