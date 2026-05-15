import { createClient } from "@/lib/supabase/server";
import { getDatePartsInBR } from "@/lib/utils/format-datetime-br";

import { getKpiDefinitions } from "../get-definitions";
import { enrichWithDefinitions } from "./enrich-with-definitions";
import type { CurrentMonthSnapshot } from "./types";

function getCurrentMesRef(): string {
  const { year, month } = getDatePartsInBR();
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

export async function getCurrentMonthSnapshot(
  operatorEmail: string,
): Promise<CurrentMonthSnapshot> {
  const supabase = await createClient();
  const mesRef = getCurrentMesRef();
  const normalizedEmail = operatorEmail.trim().toLowerCase();

  const { data, error } = await supabase
    .from("kpi_monthly_snapshots")
    .select("kpi_slug, valor_numerico, valor_texto, data_corte, updated_at")
    .eq("operator_email", normalizedEmail)
    .eq("mes_ref", mesRef);

  if (error) {
    console.error("[get-current-month-snapshot] erro:", error);
    return {
      hasData: false,
      mesRef,
      dataCorte: null,
      updatedAt: null,
      kpis: new Map(),
    };
  }

  if (!data || data.length === 0) {
    return {
      hasData: false,
      mesRef,
      dataCorte: null,
      updatedAt: null,
      kpis: new Map(),
    };
  }

  const valuesBySlug = new Map<string, number | null>();
  for (const row of data) {
    if (row.valor_numerico !== null) {
      valuesBySlug.set(row.kpi_slug, Number(row.valor_numerico));
    }
  }

  const forecastPedidos = valuesBySlug.get("forecast_pedidos") ?? null;
  const forecastChurn = valuesBySlug.get("forecast_churn") ?? null;

  const dataCorte =
    data
      .map((r) => r.data_corte)
      .filter(Boolean)
      .sort()
      .reverse()[0] ?? null;

  const updatedAt =
    data
      .map((r) => r.updated_at)
      .filter(Boolean)
      .sort()
      .reverse()[0] ?? null;

  const txRetencaoBruta = valuesBySlug.get("tx_retencao_bruta") ?? null;

  const definitions = await getKpiDefinitions();
  const enriched = enrichWithDefinitions(
    definitions,
    valuesBySlug,
    { forecastPedidos, forecastChurn, txRetencaoBruta },
    "principal",
  );

  return {
    hasData: true,
    mesRef,
    dataCorte,
    updatedAt,
    kpis: enriched,
  };
}
