import { createClient } from "@/lib/supabase/server";
import { DEFAULT_KPI_COLUNAS_VISIVEIS } from "@/lib/kpi/gestor/kpi-colunas-config";

import { isKpiColunaSlugLocal } from "./kpi-colunas-local";

/**
 * Versão LOCAL de getKpiColunasConfig (lib/kpi/gestor, compartilhado, NÃO
 * alterado) — mesma leitura/coluna (gestor_config_fantasia.kpi_colunas_visiveis),
 * só validando contra o conjunto estendido de slugs desta rota
 * (KPI_COLUNAS_ORDER_LOCAL, que inclui os 4 KPIs novos). A ORDEM salva é
 * preservada (nunca reordenada aqui) — é ela que a tabela usa para renderizar
 * as colunas.
 */
export async function getKpiColunasConfigLocal(gestorId: string): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("gestor_config_fantasia")
    .select("kpi_colunas_visiveis")
    .eq("gestor_id", gestorId)
    .maybeSingle();

  if (error) {
    console.error("[getKpiColunasConfigLocal] erro:", error.message);
    return DEFAULT_KPI_COLUNAS_VISIVEIS;
  }

  const salvas = data?.kpi_colunas_visiveis;
  if (!Array.isArray(salvas) || salvas.length === 0) {
    return DEFAULT_KPI_COLUNAS_VISIVEIS;
  }

  const validas = salvas.filter(
    (s): s is string => typeof s === "string" && isKpiColunaSlugLocal(s),
  );

  return validas.length > 0 ? validas : DEFAULT_KPI_COLUNAS_VISIVEIS;
}
