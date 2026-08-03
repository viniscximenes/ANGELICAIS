import { createClient } from "@/lib/supabase/server";

import {
  DEFAULT_META_TX_RETENCAO,
  DEFAULT_ORDEM_TABELA,
  isOrdemTabela,
  type ConfigTabela,
} from "./types";

/**
 * Config de exibição da tabela do gestor (meta de TX + ordenação),
 * armazenada em `gestor_config_fantasia` (mesma linha usada pelo módulo de
 * nome fantasia e pela meta do Dashboard de Retenção).
 */
export async function getConfigTabela(gestorId: string): Promise<ConfigTabela> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("gestor_config_fantasia")
    .select("meta_tx_retencao, ordem_tabela")
    .eq("gestor_id", gestorId)
    .maybeSingle();

  if (error) {
    console.error("[getConfigTabela] erro:", error.message);
  }

  const metaTxRetencao =
    data?.meta_tx_retencao !== null && data?.meta_tx_retencao !== undefined
      ? Number(data.meta_tx_retencao)
      : DEFAULT_META_TX_RETENCAO;

  const ordemTabela =
    data?.ordem_tabela && isOrdemTabela(data.ordem_tabela)
      ? data.ordem_tabela
      : DEFAULT_ORDEM_TABELA;

  return { metaTxRetencao, ordemTabela };
}
