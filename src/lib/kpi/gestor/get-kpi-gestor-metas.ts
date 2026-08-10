import { createClient } from "@/lib/supabase/server";

import type { MetaGestorConfig } from "./avaliar-meta-gestor";
import { DEFAULT_KPI_GESTOR_METAS, KPI_GESTOR_CARDS } from "./kpi-gestor-cards-config";

/**
 * Metas configuráveis do gestor pra /kpi/gestor (gestor_config_fantasia.kpi_gestor_metas).
 * Preenche qualquer slug ausente na linha salva com o default (mesmo default da coluna
 * no banco) — cobre tanto "gestor nunca configurou nada" quanto "KPI novo adicionado
 * depois que o gestor já tinha salvo a config".
 */
export async function getKpiGestorMetas(
  gestorId: string,
): Promise<Record<string, MetaGestorConfig>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("gestor_config_fantasia")
    .select("kpi_gestor_metas")
    .eq("gestor_id", gestorId)
    .maybeSingle();

  if (error) {
    console.error("[getKpiGestorMetas] erro:", error.message);
  }

  const salvo = (data?.kpi_gestor_metas ?? {}) as Record<string, MetaGestorConfig>;

  const resultado: Record<string, MetaGestorConfig> = {};
  for (const card of KPI_GESTOR_CARDS) {
    resultado[card.configSlug] =
      salvo[card.configSlug] ?? DEFAULT_KPI_GESTOR_METAS[card.configSlug] ?? { meta: null, direcao: null };
  }
  return resultado;
}
