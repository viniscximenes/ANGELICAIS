import { createClient } from "@/lib/supabase/server";

import type {
  BinaryIndicator,
  BonusCondition,
  CombinedBonus,
  Comparison,
  DeflatorType,
  Direction,
  EligibilityRule,
  Faixa,
  FullRuleSet,
  Multiplier,
  RvRuleSet,
  RvScope,
  TieredIndicator,
} from "./types";

/**
 * Lê o conjunto completo de regras de um scope (current ou previous).
 * Faz 1 query do rule_set + 6 em paralelo das tabelas filhas.
 * Retorna null se o rule_set do scope não existir.
 */
export async function getFullRuleSet(
  scope: RvScope,
): Promise<FullRuleSet | null> {
  const supabase = await createClient();

  const { data: rsRow, error: rsError } = await supabase
    .from("rv_rule_sets")
    .select("id, scope, teto_base, multiplicador_max_pct")
    .eq("scope", scope)
    .maybeSingle();

  if (rsError) {
    console.error("[get-rule-set] erro rule_set:", rsError);
    return null;
  }

  if (!rsRow) return null;

  const ruleSet: RvRuleSet = {
    id: rsRow.id,
    scope: rsRow.scope,
    tetoBase: Number(rsRow.teto_base),
    multiplicadorMaxPct: Number(rsRow.multiplicador_max_pct),
  };

  const [eligRes, tieredRes, binaryRes, bonusRes, multRes, deflRes] =
    await Promise.all([
      supabase
        .from("rv_eligibility_rules")
        .select(
          "id, rule_set_id, display_name, kpi_slug, comparison, threshold, display_order",
        )
        .eq("rule_set_id", ruleSet.id)
        .order("display_order"),
      supabase
        .from("rv_tiered_indicators")
        .select(
          "id, rule_set_id, slug, display_name, kpi_slug, direction, faixas, requires_indicator_slug, requires_threshold, display_order",
        )
        .eq("rule_set_id", ruleSet.id)
        .order("display_order"),
      supabase
        .from("rv_binary_indicators")
        .select(
          "id, rule_set_id, slug, display_name, kpi_slug, comparison, threshold, value_if_achieved, display_order",
        )
        .eq("rule_set_id", ruleSet.id)
        .order("display_order"),
      supabase
        .from("rv_combined_bonus")
        .select(
          "id, rule_set_id, display_name, conditions, value_if_all_achieved, display_order",
        )
        .eq("rule_set_id", ruleSet.id)
        .order("display_order"),
      supabase
        .from("rv_multiplier")
        .select(
          "id, rule_set_id, display_name, kpi_slug, forecast_kpi_slug, cap_at_100_pct",
        )
        .eq("rule_set_id", ruleSet.id)
        .maybeSingle(),
      supabase
        .from("rv_deflator_types")
        .select(
          "id, rule_set_id, display_name, initial_percent, increment_per_occurrence, auto_from_kpi_slug, auto_comparison, auto_threshold, display_order",
        )
        .eq("rule_set_id", ruleSet.id)
        .order("display_order"),
    ]);

  if (
    eligRes.error ||
    tieredRes.error ||
    binaryRes.error ||
    bonusRes.error ||
    multRes.error ||
    deflRes.error
  ) {
    console.error("[get-rule-set] erro em alguma query filha");
    return null;
  }

  const eligibility: EligibilityRule[] = (eligRes.data ?? []).map((r) => ({
    id: r.id,
    ruleSetId: r.rule_set_id,
    displayName: r.display_name,
    kpiSlug: r.kpi_slug,
    comparison: r.comparison as Comparison,
    threshold: Number(r.threshold),
    displayOrder: r.display_order,
  }));

  const tiered: TieredIndicator[] = (tieredRes.data ?? []).map((r) => ({
    id: r.id,
    ruleSetId: r.rule_set_id,
    slug: r.slug,
    displayName: r.display_name,
    kpiSlug: r.kpi_slug,
    direction: r.direction as Direction,
    faixas: (r.faixas as Faixa[]) ?? [],
    requiresIndicatorSlug: r.requires_indicator_slug,
    requiresThreshold:
      r.requires_threshold !== null ? Number(r.requires_threshold) : null,
    displayOrder: r.display_order,
  }));

  const binary: BinaryIndicator[] = (binaryRes.data ?? []).map((r) => ({
    id: r.id,
    ruleSetId: r.rule_set_id,
    slug: r.slug,
    displayName: r.display_name,
    kpiSlug: r.kpi_slug,
    comparison: r.comparison as Comparison,
    threshold: Number(r.threshold),
    valueIfAchieved: Number(r.value_if_achieved),
    displayOrder: r.display_order,
  }));

  const combinedBonus: CombinedBonus[] = (bonusRes.data ?? []).map((r) => ({
    id: r.id,
    ruleSetId: r.rule_set_id,
    displayName: r.display_name,
    conditions: (r.conditions as BonusCondition[]) ?? [],
    valueIfAllAchieved: Number(r.value_if_all_achieved),
    displayOrder: r.display_order,
  }));

  const multiplier: Multiplier | null = multRes.data
    ? {
        id: multRes.data.id,
        ruleSetId: multRes.data.rule_set_id,
        displayName: multRes.data.display_name,
        kpiSlug: multRes.data.kpi_slug,
        forecastKpiSlug: multRes.data.forecast_kpi_slug,
        capAt100Pct: multRes.data.cap_at_100_pct,
      }
    : null;

  const deflatorTypes: DeflatorType[] = (deflRes.data ?? []).map((r) => ({
    id: r.id,
    ruleSetId: r.rule_set_id,
    displayName: r.display_name,
    initialPercent: Number(r.initial_percent),
    incrementPerOccurrence: Number(r.increment_per_occurrence),
    autoFromKpiSlug: r.auto_from_kpi_slug,
    autoComparison: r.auto_comparison as Comparison | null,
    autoThreshold: r.auto_threshold !== null ? Number(r.auto_threshold) : null,
    displayOrder: r.display_order,
    isAuto: r.auto_from_kpi_slug !== null,
  }));

  return {
    ruleSet,
    eligibility,
    tiered,
    binary,
    combinedBonus,
    multiplier,
    deflatorTypes,
  };
}
