import { createClient } from "@/lib/supabase/server";

export type MonthSummary = {
  mesRef: string;
  dataCorte: string;
  updatedAt: string;
  totalOperators: number;
};

/**
 * Resumo dos snapshots agrupados por mês, do mais recente pro mais antigo.
 *
 * Agrega no banco via RPC `get_kpi_months_summary` (GROUP BY mes_ref),
 * retornando ~1 linha por mês. Antes puxava a tabela inteira e agrupava em
 * JS, o que esbarrava no teto de ~1000 linhas do PostgREST (cada mês tem
 * milhares de linhas), fazendo meses inteiros sumirem da lista.
 */
export async function getSnapshotsSummary(): Promise<MonthSummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_kpi_months_summary");

  if (error) {
    console.error("[snapshots-summary] erro:", error);
    return [];
  }

  if (!data) return [];

  // A RPC já ordena por mes_ref desc; mapeia 1:1 pra MonthSummary.
  return data.map(
    (row: {
      mes_ref: string;
      data_corte: string;
      updated_at: string;
      total_operators: number | string;
    }) => ({
      mesRef: row.mes_ref,
      dataCorte: row.data_corte,
      updatedAt: row.updated_at,
      totalOperators: Number(row.total_operators),
    }),
  );
}
