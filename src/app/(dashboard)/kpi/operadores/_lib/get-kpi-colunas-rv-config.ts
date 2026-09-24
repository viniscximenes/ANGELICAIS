import { createClient } from "@/lib/supabase/server";

import { DEFAULT_RV_COLUNAS, isRvColunaId, type RvColunaId } from "./rv-colunas-config";

/**
 * Colunas de RV visíveis (gestor_config_fantasia.kpi_colunas_rv) —
 * NULL/inválido = padrão (todas, ver DEFAULT_RV_COLUNAS).
 */
export async function getKpiColunasRvConfig(gestorId: string): Promise<RvColunaId[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("gestor_config_fantasia")
    .select("kpi_colunas_rv")
    .eq("gestor_id", gestorId)
    .maybeSingle();

  if (error) {
    console.error("[getKpiColunasRvConfig] erro:", error.message);
    return DEFAULT_RV_COLUNAS;
  }

  const salvas = data?.kpi_colunas_rv;
  if (salvas === null || salvas === undefined || !Array.isArray(salvas)) {
    return DEFAULT_RV_COLUNAS;
  }

  const validas = salvas.filter(
    (s): s is RvColunaId => typeof s === "string" && isRvColunaId(s),
  );

  return validas;
}
