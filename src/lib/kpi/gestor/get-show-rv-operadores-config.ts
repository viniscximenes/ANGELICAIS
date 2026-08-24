import { createClient } from "@/lib/supabase/server";

/**
 * Estado salvo do toggle "Exibir RV" de /kpi/operadores —
 * gestor_config_fantasia.show_rv_operadores. Coluna própria (não
 * compartilhada com show_rv_diario do Consolidado): são toggles
 * independentes, cada um com sua própria preferência por gestor.
 */
export async function getShowRvOperadoresConfig(gestorId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("gestor_config_fantasia")
    .select("show_rv_operadores")
    .eq("gestor_id", gestorId)
    .maybeSingle();

  if (error) {
    console.error("[getShowRvOperadoresConfig] erro:", error.message);
    return false;
  }

  return data?.show_rv_operadores ?? false;
}
