import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Retenção de 2 meses pra d1_tma / d1_tma_atendimentos — mesmo horizonte
 * usado pelas outras bases diárias (evita acúmulo indefinido de
 * d1_tma_atendimentos, que grava uma linha por segmento de ligação).
 * Chamada antes do upsert de cada import.
 */
export async function enforceRetentionTma(dataRef: string): Promise<void> {
  const admin = createAdminClient();

  const cutoffDate = new Date(`${dataRef}T00:00:00Z`);
  cutoffDate.setUTCMonth(cutoffDate.getUTCMonth() - 2);
  const cutoff = cutoffDate.toISOString().slice(0, 10);

  const { error: erroTma } = await admin.from("d1_tma").delete().lt("data_ref", cutoff);
  if (erroTma) {
    console.error("[enforce-retention-tma] erro ao limpar d1_tma:", erroTma.message);
  }

  const { error: erroAtendimentos } = await admin
    .from("d1_tma_atendimentos")
    .delete()
    .lt("data_ref", cutoff);
  if (erroAtendimentos) {
    console.error(
      "[enforce-retention-tma] erro ao limpar d1_tma_atendimentos:",
      erroAtendimentos.message,
    );
  }
}
