import { createClient } from "@/lib/supabase/server";
import { DEFAULT_META_TX_RETENCAO } from "@/lib/gestor/config-tabela/types";

export type MetasPolo = {
  /** Meta de TX Retenção do polo (0–100). */
  meta: number;
  /** Meta de TX Retenção do tema financeiro (0–100); sem valor salvo = meta do polo. */
  metaFinanceiro: number;
};

/** Metas do coordenador — tabela coordenador_config. */
export async function getMetasPolo(coordenadorId: string): Promise<MetasPolo> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coordenador_config")
    .select("meta_tx_retencao, meta_tx_financeiro")
    .eq("coordenador_id", coordenadorId)
    .maybeSingle();

  if (error) {
    console.error("[getMetasPolo] erro:", error.message);
  }

  const meta =
    data?.meta_tx_retencao !== null && data?.meta_tx_retencao !== undefined
      ? Number(data.meta_tx_retencao)
      : DEFAULT_META_TX_RETENCAO;
  const metaFinanceiro =
    data?.meta_tx_financeiro !== null && data?.meta_tx_financeiro !== undefined
      ? Number(data.meta_tx_financeiro)
      : meta;

  return { meta, metaFinanceiro };
}
