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

type GestorRow = {
  mes_ref: string;
  data_corte: string;
  supervisor_name: string;
  updated_at?: string;
};

function processGestorRows(rows: GestorRow[]): MonthSummary[] {
  const groups = new Map<
    string,
    {
      mesRef: string;
      dataCorte: string;
      updatedAt: string;
      supervisors: Set<string>;
    }
  >();

  for (const row of rows) {
    const mesRef = row.mes_ref;
    const dataCorte = row.data_corte;
    const updatedAt = row.updated_at || row.data_corte;
    const supervisor = row.supervisor_name;

    const existing = groups.get(mesRef);
    if (!existing) {
      groups.set(mesRef, {
        mesRef,
        dataCorte,
        updatedAt,
        supervisors: new Set([supervisor]),
      });
    } else {
      if (dataCorte > existing.dataCorte) {
        existing.dataCorte = dataCorte;
      }
      if (updatedAt > existing.updatedAt) {
        existing.updatedAt = updatedAt;
      }
      existing.supervisors.add(supervisor);
    }
  }

  const result = Array.from(groups.values()).map((g) => ({
    mesRef: g.mesRef,
    dataCorte: g.dataCorte,
    updatedAt: g.updatedAt,
    totalOperators: g.supervisors.size,
  }));

  result.sort((a, b) => (a.mesRef < b.mesRef ? 1 : a.mesRef > b.mesRef ? -1 : 0));
  return result;
}

export async function getGestorSnapshotsSummary(): Promise<MonthSummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("kpi_gestor_snapshots")
    .select("mes_ref, data_corte, supervisor_name, updated_at");

  if (error) {
    console.error(
      "[gestor-snapshots-summary] erro:",
      error.message,
      `(code: ${error.code}, details: ${error.details}, hint: ${error.hint})`,
    );
    return [];
  }

  return processGestorRows((data as unknown as GestorRow[]) || []);
}
