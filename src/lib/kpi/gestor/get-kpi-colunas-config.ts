import { createClient } from "@/lib/supabase/server";

import { DEFAULT_KPI_COLUNAS_VISIVEIS, isKpiColunaSlug } from "./kpi-colunas-config";

/**
 * Colunas de KPI visíveis na tabela de /operacional/kpi, configuradas pelo
 * gestor (gestor_config_fantasia.kpi_colunas_visiveis — mesma linha usada
 * pelo módulo de nome fantasia e pela config-tabela do D-1). Vazio/não
 * configurado ainda → default (as 7 colunas principais originais).
 */
export async function getKpiColunasConfig(gestorId: string): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("gestor_config_fantasia")
    .select("kpi_colunas_visiveis")
    .eq("gestor_id", gestorId)
    .maybeSingle();

  if (error) {
    console.error("[getKpiColunasConfig] erro:", error.message);
    return DEFAULT_KPI_COLUNAS_VISIVEIS;
  }

  const salvas = data?.kpi_colunas_visiveis;
  if (!Array.isArray(salvas) || salvas.length === 0) {
    return DEFAULT_KPI_COLUNAS_VISIVEIS;
  }

  const validas = salvas.filter(
    (s): s is string => typeof s === "string" && isKpiColunaSlug(s),
  );

  return validas.length > 0 ? validas : DEFAULT_KPI_COLUNAS_VISIVEIS;
}
