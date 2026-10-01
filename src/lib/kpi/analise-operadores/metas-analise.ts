import type { KpiDefinition, KpiValueType } from "@/lib/kpi/types";

import { PRINCIPAIS_SLUGS } from "./constants";

/**
 * Metas editáveis de /kpi/evolucao — uma por KPI principal (Tx. Retenção
 * Bruta, TMA, ABS, Indisp Total). Valem SÓ neste relatório: não alteram
 * kpi_definitions nem nenhuma outra tela.
 *
 * Unidades = as do próprio KPI: percentuais em % (ex.: 63), TMA em
 * segundos (ex.: 780 = 13:00).
 */
export type MetaAnaliseKpi = {
  slug: string;
  displayName: string;
  valueType: KpiValueType;
  direction: KpiDefinition["direction"];
  /** Meta padrão de kpi_definitions (null quando o KPI não tem). */
  padrao: number | null;
  /** Override do gestor nesta página (null = usa o padrão). */
  override: number | null;
  /** Meta efetiva (override ?? padrão). */
  meta: number | null;
};

/** slug → meta personalizada (só os KPIs com override salvo). */
export type MetasOverrideAnalise = Record<string, number>;

/** Linha de referência padrão de um KPI (binary → threshold_red; three_tier → threshold_yellow). */
export function metaLinhaDaDefinicao(def: KpiDefinition): number | null {
  if (def.coloringType === "binary") return def.thresholdRed;
  if (def.coloringType === "three_tier") {
    return def.thresholdYellow ?? def.thresholdRed;
  }
  return null;
}

/** Metas dos KPIs principais, na ordem de PRINCIPAIS_SLUGS. */
export function buildMetasAnalise(
  definitions: KpiDefinition[],
  overrides: MetasOverrideAnalise,
): MetaAnaliseKpi[] {
  return PRINCIPAIS_SLUGS.flatMap((slug) => {
    const def = definitions.find((d) => d.slug === slug);
    if (!def) return [];
    const padrao = metaLinhaDaDefinicao(def);
    const override = overrides[slug] ?? null;
    return [
      {
        slug,
        displayName: def.displayName,
        valueType: def.valueType,
        direction: def.direction,
        padrao,
        override,
        meta: override ?? padrao,
      },
    ];
  });
}

/**
 * Status de um valor contra a meta personalizada, pela direção do KPI:
 * higher_better → valor >= meta; lower_better → valor <= meta.
 */
export function statusContraMeta(
  valor: number | null,
  meta: number,
  direction: KpiDefinition["direction"],
): "success" | "danger" | "neutral" {
  if (valor === null) return "neutral";
  if (direction === "lower_better") return valor <= meta ? "success" : "danger";
  return valor >= meta ? "success" : "danger";
}
