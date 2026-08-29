import { createClient } from "@/lib/supabase/server";

type HistoricoOperador = {
  /** mes_ref (YYYY-MM-01) → (kpi_slug → valor_numerico | null). Só meses com algum dado. */
  porMes: Map<string, Map<string, number | null>>;
};

/**
 * Série histórica bruta de KPI de UM operador em kpi_monthly_snapshots,
 * dentro do range de mes_ref do período selecionado.
 *
 * `operatorEmailCandidates` = email do operador + variantes de domínio +
 * alias de KPI (ver resolveKpiEmailCandidatesForProfiles). Consultamos
 * todos e consolidamos o que vier — o mesmo operador pode ter dado em
 * meses diferentes sob emails diferentes.
 *
 * Volume: 1 operador × ~24 meses × ~29 slugs → algumas centenas de linhas.
 * Bem abaixo do teto do PostgREST, sem paginação.
 */
export async function getHistoricoOperador(params: {
  operatorEmailCandidates: string[];
  mesRefInicial: string | null;
}): Promise<HistoricoOperador> {
  const { operatorEmailCandidates, mesRefInicial } = params;
  const porMes = new Map<string, Map<string, number | null>>();

  if (operatorEmailCandidates.length === 0) return { porMes };

  const supabase = await createClient();

  let query = supabase
    .from("kpi_monthly_snapshots")
    .select("mes_ref, kpi_slug, valor_numerico")
    .in("operator_email", operatorEmailCandidates);

  if (mesRefInicial) {
    query = query.gte("mes_ref", mesRefInicial);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getHistoricoOperador] erro:", error.message);
    return { porMes };
  }

  for (const row of data ?? []) {
    const mesRef = row.mes_ref as string;
    if (!porMes.has(mesRef)) porMes.set(mesRef, new Map());
    const valor =
      row.valor_numerico !== null ? Number(row.valor_numerico) : null;
    porMes.get(mesRef)!.set(row.kpi_slug as string, valor);
  }

  return { porMes };
}
