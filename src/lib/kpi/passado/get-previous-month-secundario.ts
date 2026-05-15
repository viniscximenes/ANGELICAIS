import { createClient } from "@/lib/supabase/server";
import { getDatePartsInBR } from "@/lib/utils/format-datetime-br";

import { getKpiDefinitions } from "../get-definitions";
import type { NeutralKpiValue, PreviousMonthSnapshot } from "./types";

function getPreviousMonthRef(): string {
  const { year, month } = getDatePartsInBR();
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  return `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
}

export async function getPreviousMonthSecundario(
  operatorEmail: string,
): Promise<PreviousMonthSnapshot> {
  const supabase = await createClient();
  const mesRef = getPreviousMonthRef();
  const normalizedEmail = operatorEmail.trim().toLowerCase();

  const { data: anyData, error: anyError } = await supabase
    .from("kpi_monthly_snapshots")
    .select("id")
    .eq("mes_ref", mesRef)
    .limit(1);

  if (anyError) {
    console.error("[get-previous-month-secundario] erro check:", anyError);
    return {
      hasData: false,
      hasAnyDataInBank: false,
      mesRef,
      dataCorte: null,
      kpis: new Map(),
    };
  }

  const hasAnyDataInBank = (anyData?.length ?? 0) > 0;

  if (!hasAnyDataInBank) {
    return {
      hasData: false,
      hasAnyDataInBank: false,
      mesRef,
      dataCorte: null,
      kpis: new Map(),
    };
  }

  const { data, error } = await supabase
    .from("kpi_monthly_snapshots")
    .select("kpi_slug, valor_numerico, data_corte")
    .eq("operator_email", normalizedEmail)
    .eq("mes_ref", mesRef);

  if (error) {
    console.error("[get-previous-month-secundario] erro fetch:", error);
    return {
      hasData: false,
      hasAnyDataInBank: true,
      mesRef,
      dataCorte: null,
      kpis: new Map(),
    };
  }

  if (!data || data.length === 0) {
    return {
      hasData: false,
      hasAnyDataInBank: true,
      mesRef,
      dataCorte: null,
      kpis: new Map(),
    };
  }

  const valuesBySlug = new Map<string, number | null>();
  for (const row of data) {
    if (row.valor_numerico !== null) {
      valuesBySlug.set(row.kpi_slug, Number(row.valor_numerico));
    }
  }

  const dataCorte =
    data
      .map((r) => r.data_corte)
      .filter(Boolean)
      .sort()
      .reverse()[0] ?? null;

  const definitions = await getKpiDefinitions();
  const kpis = new Map<string, NeutralKpiValue>();

  for (const def of definitions) {
    if (def.groupType !== "secundario") continue;

    kpis.set(def.slug, {
      definition: def,
      valor: valuesBySlug.get(def.slug) ?? null,
    });
  }

  return {
    hasData: true,
    hasAnyDataInBank: true,
    mesRef,
    dataCorte,
    kpis,
  };
}
