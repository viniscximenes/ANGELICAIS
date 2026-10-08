import { createClient } from "@/lib/supabase/server";

import { DEFAULT_CONFIG_ADERENCIA, parseConfigAderencia, type ConfigAderencia } from "./types";

/**
 * Lê a config de aderência de pausas do gestor. Gestor que nunca salvou
 * (linha inexistente) recebe os defaults — mesma tolerância a ausência que
 * getConfigTabela tem.
 *
 * `erro`: a leitura falhou e os valores vieram no padrão — a página trata
 * como erro (mesmo campo de getConfigTabela, do Consolidado), em vez de
 * avaliar a aderência com uma tolerância que pode não ser a do gestor.
 */
export async function getConfigAderencia(
  gestorId: string,
): Promise<ConfigAderencia & { erro: boolean }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("gestor_config_fantasia")
    .select("config_aderencia")
    .eq("gestor_id", gestorId)
    .maybeSingle();

  if (error) {
    console.error("[getConfigAderencia] erro:", error.message);
    return { ...DEFAULT_CONFIG_ADERENCIA, erro: true };
  }

  return { ...parseConfigAderencia(data?.config_aderencia), erro: false };
}
