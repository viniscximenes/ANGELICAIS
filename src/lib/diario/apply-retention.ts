import { createClient } from "@/lib/supabase/server";

const MAX_MONTHS = 2;

/**
 * Mantém apenas os últimos MAX_MONTHS meses únicos de registros.
 * Chamar ANTES de inserir um registro novo.
 *
 * @param newDataOcorrido "YYYY-MM-DD" do registro sendo criado
 * @returns array de meses (YYYY-MM) que foram apagados
 */
export async function applyDiarioRetention(
  newDataOcorrido: string,
): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("diario_registros")
    .select("data_ocorrido");

  if (error) {
    console.error("[diario-retention] erro:", error);
    return [];
  }

  const existingMonths = new Set<string>(
    (data ?? []).map((r) => (r.data_ocorrido as string).slice(0, 7)),
  );

  existingMonths.add(newDataOcorrido.slice(0, 7));

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
      .from("diario_registros")
      .delete()
      .gte("data_ocorrido", start)
      .lt("data_ocorrido", end);

    if (delErr) {
      console.error(`[diario-retention] erro ao apagar ${month}:`, delErr);
    }
  }

  return toDelete;
}
