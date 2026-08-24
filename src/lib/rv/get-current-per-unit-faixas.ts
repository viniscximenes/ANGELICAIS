import { createAdminClient } from "@/lib/supabase/admin";

import type { PerUnitFaixa } from "./types";

/**
 * Faixas (TX% → R$ por retido) do indicador per-unit do rule_set "current".
 * Fetcher dedicado (não usa getFullRuleSet, que traz 7 tabelas filhas
 * desnecessárias pra esse caso e usa client de sessão sujeito a RLS) — mesma
 * convenção de createAdminClient() já usada por getGestorConsolidado,
 * getPorTema e getEvolucaoHora.
 *
 * Hoje só existe uma mecânica per-unit configurada (ver comentário em
 * PerUnitIndicatorCard); se um dia houver mais de uma, pega a de menor
 * display_order.
 */
export async function getCurrentPerUnitFaixas(): Promise<PerUnitFaixa[]> {
  const supabase = createAdminClient();

  const { data: ruleSet, error: ruleSetError } = await supabase
    .from("rv_rule_sets")
    .select("id")
    .eq("scope", "current")
    .maybeSingle();

  if (ruleSetError || !ruleSet) {
    if (ruleSetError) {
      console.error("[getCurrentPerUnitFaixas] erro ao buscar rule_set:", ruleSetError.message);
    }
    return [];
  }

  const { data: indicator, error: indicatorError } = await supabase
    .from("rv_per_unit_indicators")
    .select("faixas")
    .eq("rule_set_id", ruleSet.id)
    .order("display_order")
    .limit(1)
    .maybeSingle();

  if (indicatorError) {
    console.error("[getCurrentPerUnitFaixas] erro ao buscar per_unit_indicators:", indicatorError.message);
    return [];
  }

  return (indicator?.faixas as PerUnitFaixa[]) ?? [];
}
