import { createClient } from "@/lib/supabase/server";

const MAX_MONTHS = 2;

/**
 * Mantém apenas os últimos MAX_MONTHS meses únicos de monitorias.
 * Chamar ANTES de inserir uma monitoria nova.
 *
 * @param newDataAtendimento "YYYY-MM-DD" da monitoria sendo criada
 * @returns array de meses (YYYY-MM) que foram apagados
 */
export async function applyMonitoriaRetention(
  newDataAtendimento: string,
): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("monitorias")
    .select("data_atendimento");

  if (error) {
    console.error("[monitoria-retention] erro:", error);
    return [];
  }

  const existingMonths = new Set<string>(
    (data ?? []).map((r) => (r.data_atendimento as string).slice(0, 7)),
  );

  const newMonth = newDataAtendimento.slice(0, 7);
  existingMonths.add(newMonth);

  const sorted = Array.from(existingMonths).sort().reverse();
  const toDelete = sorted.slice(MAX_MONTHS);

  if (toDelete.length === 0) return [];

  for (const month of toDelete) {
    const start = `${month}-01`;
    const [y, m] = month.split("-").map(Number);
    const nextMonth =
      m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
    const end = `${nextMonth}-01`;

    const { error: delErr } = await supabase
      .from("monitorias")
      .delete()
      .gte("data_atendimento", start)
      .lt("data_atendimento", end);

    if (delErr) {
      console.error(`[monitoria-retention] erro ao apagar ${month}:`, delErr);
    }
  }

  return toDelete;
}
