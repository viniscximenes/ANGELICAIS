import { createClient } from "@/lib/supabase/server";

/**
 * Busca a meta de taxa de retenção personalizada do gestor.
 * Retorna o valor na escala 0-100. Default: 60.
 */
export async function getMetaTxRetencao(gestorId: string): Promise<number> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("gestor_config_fantasia")
    .select("meta_tx_retencao")
    .eq("gestor_id", gestorId)
    .maybeSingle();

  if (error) {
    console.error("[getMetaTxRetencao] erro ao buscar meta:", error.message);
    return 60;
  }

  return data?.meta_tx_retencao !== null && data?.meta_tx_retencao !== undefined
    ? Number(data.meta_tx_retencao)
    : 60;
}

/**
 * Salva a meta de taxa de retenção do gestor logado no banco de dados.
 * Valida se o valor está no intervalo [0, 100].
 */
export async function salvarMetaTxRetencao(
  gestorId: string,
  valor: number,
): Promise<{ success: boolean; error?: string }> {
  if (isNaN(valor) || valor < 0 || valor > 100) {
    return { success: false, error: "A meta deve ser um valor entre 0 e 100." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("gestor_config_fantasia")
    .upsert(
      { gestor_id: gestorId, meta_tx_retencao: valor },
      { onConflict: "gestor_id" },
    );

  if (error) {
    console.error("[salvarMetaTxRetencao] erro ao salvar meta:", error.message);
    return { success: false, error: "Erro ao salvar a meta no banco de dados." };
  }

  return { success: true };
}
