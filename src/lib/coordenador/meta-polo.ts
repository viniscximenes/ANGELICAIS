import { createClient } from "@/lib/supabase/server";
import { DEFAULT_META_TX_RETENCAO } from "@/lib/gestor/config-tabela/types";

/** Meta de TX Retenção do polo (0–100), por coordenador — tabela coordenador_config. */
export async function getMetaPolo(coordenadorId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coordenador_config")
    .select("meta_tx_retencao")
    .eq("coordenador_id", coordenadorId)
    .maybeSingle();

  if (error) {
    console.error("[getMetaPolo] erro:", error.message);
  }

  return data?.meta_tx_retencao !== null && data?.meta_tx_retencao !== undefined
    ? Number(data.meta_tx_retencao)
    : DEFAULT_META_TX_RETENCAO;
}
