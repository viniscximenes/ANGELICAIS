import { createClient } from "@/lib/supabase/server";
import { DEFAULT_META_TX_RETENCAO } from "@/lib/gestor/config-tabela/types";
import type { MetasTemas } from "@/lib/coordenador/types";

export type MetasPolo = {
  /** Meta de TX Retenção do polo (0–100). */
  meta: number;
  /** Meta de TX Retenção por tema (0–100); tema sem valor salvo = meta do polo. */
  metasTemas: MetasTemas;
  /** Chaves dos cards que o coordenador deixou recolhidos no /c/reports/consolidado. */
  cardsRecolhidos: string[];
};

/** Metas do coordenador — tabela coordenador_config. */
export async function getMetasPolo(coordenadorId: string): Promise<MetasPolo> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coordenador_config")
    .select("meta_tx_retencao, meta_tx_financeiro, meta_tx_temas, cards_recolhidos")
    .eq("coordenador_id", coordenadorId)
    .maybeSingle();

  if (error) {
    console.error("[getMetasPolo] erro:", error.message);
  }

  const meta =
    data?.meta_tx_retencao !== null && data?.meta_tx_retencao !== undefined
      ? Number(data.meta_tx_retencao)
      : DEFAULT_META_TX_RETENCAO;

  const metasTemas: MetasTemas = {};
  const salvas = (data?.meta_tx_temas ?? {}) as Record<string, unknown>;
  for (const [tema, valor] of Object.entries(salvas)) {
    const num = Number(valor);
    if (valor !== null && !Number.isNaN(num)) metasTemas[tema] = num;
  }
  // Coluna antiga (antes das metas por tema) — só vale se o tema não foi salvo no JSON.
  if (metasTemas["Mot. Financeiro"] === undefined && data?.meta_tx_financeiro != null) {
    metasTemas["Mot. Financeiro"] = Number(data.meta_tx_financeiro);
  }

  const cardsRecolhidos = Array.isArray(data?.cards_recolhidos)
    ? (data.cards_recolhidos as unknown[]).filter((c): c is string => typeof c === "string")
    : [];

  return { meta, metasTemas, cardsRecolhidos };
}
