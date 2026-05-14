import { createClient } from "@/lib/supabase/server";

export type MonthSummary = {
  mesRef: string;
  dataCorte: string;
  updatedAt: string;
  totalOperators: number;
};

/**
 * Resumo dos snapshots agrupados por mês, do mais recente pro mais antigo.
 * Agrupa em JS porque o cliente Supabase não tem GROUP BY nativo.
 */
export async function getSnapshotsSummary(): Promise<MonthSummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("kpi_monthly_snapshots")
    .select("mes_ref, data_corte, updated_at, operator_email");

  if (error) {
    console.error("[snapshots-summary] erro:", error);
    return [];
  }

  if (!data) return [];

  const byMonth = new Map<
    string,
    {
      dataCorte: string;
      updatedAt: string;
      operators: Set<string>;
    }
  >();

  for (const row of data) {
    const existing = byMonth.get(row.mes_ref);
    if (!existing) {
      byMonth.set(row.mes_ref, {
        dataCorte: row.data_corte,
        updatedAt: row.updated_at,
        operators: new Set([row.operator_email]),
      });
    } else {
      existing.operators.add(row.operator_email);
      if (row.data_corte > existing.dataCorte) {
        existing.dataCorte = row.data_corte;
      }
      if (row.updated_at > existing.updatedAt) {
        existing.updatedAt = row.updated_at;
      }
    }
  }

  return Array.from(byMonth.entries())
    .map(([mesRef, info]) => ({
      mesRef,
      dataCorte: info.dataCorte,
      updatedAt: info.updatedAt,
      totalOperators: info.operators.size,
    }))
    .sort((a, b) => b.mesRef.localeCompare(a.mesRef));
}
