import { createAdminClient } from "@/lib/supabase/admin";
import { getDatePartsInBR } from "@/lib/utils/format-datetime-br";

export type AplicarRetencaoResult = {
  success: boolean;
  rowsDeleted: number;
  error?: string;
};

/**
 * Mantém em db_pausas_diario apenas o mês atual + o mês passado (dias com
 * data_ref anterior ao primeiro dia do mês passado são apagados). Mesmo
 * corte de public.db_pausas_diario WHERE data_ref < (date_trunc('month',
 * CURRENT_DATE) - interval '1 month')::date, calculado em JS na hora de
 * Brasília pra não depender de CURRENT_DATE do servidor Postgres.
 */
export async function aplicarRetencaoPausas(): Promise<AplicarRetencaoResult> {
  const { year, month } = getDatePartsInBR();
  const mesPassadoMonth = month === 1 ? 12 : month - 1;
  const mesPassadoYear = month === 1 ? year - 1 : year;
  const cutoff = `${mesPassadoYear}-${String(mesPassadoMonth).padStart(2, "0")}-01`;

  const supabase = createAdminClient();
  const { error, count } = await supabase
    .from("db_pausas_diario")
    .delete({ count: "exact" })
    .lt("data_ref", cutoff);

  if (error) {
    console.error("[retencao-pausas] erro ao aplicar retenção:", error.message);
    return { success: false, rowsDeleted: 0, error: error.message };
  }

  return { success: true, rowsDeleted: count ?? 0 };
}
