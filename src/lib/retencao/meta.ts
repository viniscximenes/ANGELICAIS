import { DEFAULT_META_TX_RETENCAO } from "@/lib/gestor/config-tabela/types";
import { createClient } from "@/lib/supabase/server";

/**
 * Busca a meta de taxa de retenção personalizada do gestor.
 * Retorna o valor na escala 0-100. Default: DEFAULT_META_TX_RETENCAO (o
 * mesmo da tabela do Consolidado — antes era um 60 fixo aqui).
 */
export async function getMetaTxRetencao(gestorId: string): Promise<number> {
  try {
    return await getMetaTxRetencaoOuErro(gestorId);
  } catch {
    return DEFAULT_META_TX_RETENCAO;
  }
}

/**
 * Mesma leitura, mas erro de banco LANÇA em vez de virar a meta padrão.
 * Usada no detalhe do operador do Consolidado: com a meta padrão o detalhe
 * podia discordar da tabela (que mostra erro quando a config falha).
 * getMetaTxRetencao (acima) mantém o contrato de sempre para as outras telas.
 */
export async function getMetaTxRetencaoOuErro(gestorId: string): Promise<number> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("gestor_config_fantasia")
    .select("meta_tx_retencao")
    .eq("gestor_id", gestorId)
    .maybeSingle();

  if (error) {
    console.error("[getMetaTxRetencao] erro ao buscar meta:", error.message);
    throw new Error(error.message);
  }

  return data?.meta_tx_retencao !== null && data?.meta_tx_retencao !== undefined
    ? Number(data.meta_tx_retencao)
    : DEFAULT_META_TX_RETENCAO;
}
