import { resolveKpiEmailForProfile } from "@/lib/profile/get-kpi-email-for-profile";
import { createClient } from "@/lib/supabase/server";

import type { RvCalculation } from "./calc-types";
import { calculateRv } from "./calculate-rv";
import { getDeflatorApplications } from "./get-deflator-applications";
import { getFullRuleSet } from "./get-rule-set";
import type { RvScope } from "./types";

/**
 * Função integradora: lê snapshot do operador + regras + deflatores
 * e retorna o cálculo de RV.
 *
 * @param operatorEmail email corporativo do operador
 * @param mesRef "YYYY-MM-01"
 * @param scope qual conjunto de regras usar (current ou previous)
 */
export async function getRvForOperator(
  operatorEmail: string,
  mesRef: string,
  scope: RvScope,
): Promise<RvCalculation | null> {
  const supabase = await createClient();
  const normalizedEmail = operatorEmail.trim().toLowerCase();
  const emailParaBuscarKpi = await resolveKpiEmailForProfile(operatorEmail);

  const { data: snapshotRows, error: snapError } = await supabase
    .from("kpi_monthly_snapshots")
    .select("kpi_slug, valor_numerico, valor_texto")
    .eq("operator_email", emailParaBuscarKpi)
    .eq("mes_ref", mesRef);

  if (snapError) {
    console.error("[get-rv-for-operator] erro snapshot:", snapError);
    return null;
  }

  if (!snapshotRows || snapshotRows.length === 0) {
    return {
      status: "sem_dados",
      bruto: 0,
      multiplicadorPedidos: 0,
      subtotal: 0,
      somaDescontosPct: 0,
      liquido: 0,
      tetoBase: 0,
      tetoPossivel: 0,
      valorTravadoImpossivel: 0,
      tieredResults: [],
      binaryResults: [],
      combinedBonusResults: [],
      deflatorResults: [],
    };
  }

  const valuesBySlug = new Map<string, number | null>();
  let operatorStatus: string | null = null;

  for (const row of snapshotRows) {
    if (row.kpi_slug === "meta_status") {
      operatorStatus = row.valor_texto;
    } else if (row.valor_numerico !== null) {
      valuesBySlug.set(row.kpi_slug, Number(row.valor_numerico));
    }
  }

  const [ruleSet, deflatorApps] = await Promise.all([
    getFullRuleSet(scope),
    getDeflatorApplications(normalizedEmail, mesRef),
  ]);

  if (!ruleSet) {
    console.error("[get-rv-for-operator] rule set não encontrado:", scope);
    return null;
  }

  return calculateRv(valuesBySlug, operatorStatus, ruleSet, deflatorApps);
}
