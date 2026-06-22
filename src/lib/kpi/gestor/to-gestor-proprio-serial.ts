import { enrichWithDefinitions } from "@/lib/kpi/atual/enrich-with-definitions";
import type { KpiDefinition } from "@/lib/kpi/types";

import type { GestorProprioData } from "./get-kpi-gestor-proprio";
import type { GestorProprioKpiSerial, GestorProprioSerial } from "./gestor-proprio-types";
import type { KpiMetaGestor } from "./get-metas-gestor";

function mergeDefinitionsWithMetasGestor(
  definitions: KpiDefinition[],
  metas: KpiMetaGestor[],
): KpiDefinition[] {
  const metasMap = new Map(metas.map((m) => [m.slug, m]));
  return definitions.map((def) => {
    const meta = metasMap.get(def.slug);
    if (!meta) return def;
    return {
      ...def,
      thresholdRed: meta.thresholdRed,
      thresholdYellow: meta.thresholdYellow,
      thresholdDiffPercent: meta.thresholdDiffPercent,
      coloringType: meta.coloringType,
    };
  });
}

export function toGestorProprioSerial(
  data: GestorProprioData,
  definitions: KpiDefinition[],
  metas: KpiMetaGestor[],
  isMesPassado: boolean,
): GestorProprioSerial {
  const mergedDefs = mergeDefinitionsWithMetasGestor(definitions, metas);

  const toSerial = (group: "principal" | "secundario"): GestorProprioKpiSerial[] => {
    const groupDefs = mergedDefs
      .filter((d) => d.groupType === group)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    if (isMesPassado || !data.hasData) {
      return groupDefs.map((def) => ({
        slug: def.slug,
        displayName: def.displayName,
        valor: data.valuesBySlug.get(def.slug) ?? null,
        valueType: def.valueType,
        status: "neutral" as const,
        metaPorLinha: null,
        direction: def.direction,
        thresholdRed: def.thresholdRed,
        thresholdYellow: def.thresholdYellow,
        coloringType: def.coloringType,
      }));
    }

    const extra = {
      forecastPedidos: null,
      forecastChurn: data.valuesBySlug.get("forecast_churn") ?? null,
      txRetencaoBruta: data.valuesBySlug.get("tx_retencao_bruta") ?? null,
    };

    const enriched = enrichWithDefinitions(mergedDefs, data.valuesBySlug, extra, group);

    return groupDefs.map((def) => {
      const kpi = enriched.get(def.slug);
      return {
        slug: def.slug,
        displayName: def.displayName,
        valor: kpi?.valor ?? null,
        valueType: def.valueType,
        status: kpi?.status ?? "neutral",
        metaPorLinha: kpi?.metaPorLinha ?? null,
        direction: def.direction,
        thresholdRed: def.thresholdRed,
        thresholdYellow: def.thresholdYellow,
        coloringType: def.coloringType,
      };
    });
  };

  return {
    mesRef: data.mesRef,
    isMesPassado,
    dataCorte: data.dataCorte,
    hasData: data.hasData,
    principais: toSerial("principal"),
    secundarios: toSerial("secundario"),
  };
}
