import { createClient } from "@/lib/supabase/server";

/**
 * Override de meta de Tx. Retenção Bruta específico do relatório
 * /operacao/analise-operadores
 * (gestor_config_fantasia.analise_meta_tx_retencao).
 *
 * Retorna `null` quando o gestor não configurou nada — o caller cai no
 * threshold de kpi_definitions. Não é lido por nenhuma outra tela.
 */
export async function getAnaliseMetaTxRetencao(
  gestorId: string,
): Promise<number | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("gestor_config_fantasia")
    .select("analise_meta_tx_retencao")
    .eq("gestor_id", gestorId)
    .maybeSingle();

  if (error) {
    console.error("[getAnaliseMetaTxRetencao] erro:", error.message);
    return null;
  }

  const v = data?.analise_meta_tx_retencao;
  return v === null || v === undefined ? null : Number(v);
}
