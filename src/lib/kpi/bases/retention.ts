import { createAdminClient } from "@/lib/supabase/admin";

const MAX_MONTHS = 24;

/**
 * Mantém apenas os últimos MAX_MONTHS meses únicos. Apaga qualquer mês
 * que não esteja entre os MAX_MONTHS mais recentes após considerar o
 * mês novo sendo inserido. Chamar ANTES do upsert.
 *
 * Retorna a lista de meses apagados, ou [] se nada foi apagado.
 */
export async function enforceRetention(
  newMesRef: string,
): Promise<string[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("kpi_monthly_snapshots")
    .select("mes_ref")
    .order("mes_ref", { ascending: false });

  if (error) {
    console.error("[retention] erro ao ler meses:", error);
    return [];
  }

  const existingMonths = new Set((data || []).map((r) => r.mes_ref));
  existingMonths.add(newMesRef);

  const sorted = Array.from(existingMonths).sort().reverse();
  const toDelete = sorted.slice(MAX_MONTHS);

  if (toDelete.length === 0) return [];

  const { error: delError } = await supabase
    .from("kpi_monthly_snapshots")
    .delete()
    .in("mes_ref", toDelete);

  if (delError) {
    console.error("[retention] erro ao apagar meses antigos:", delError);
    return [];
  }

  return toDelete;
}
