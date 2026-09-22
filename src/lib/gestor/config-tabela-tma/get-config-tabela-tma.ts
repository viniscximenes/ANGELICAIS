import { createClient } from "@/lib/supabase/server";

import { DEFAULT_ORDEM_TABELA_TMA, isOrdemTabelaTma, type OrdemTabelaTma } from "./types";

/**
 * Ordenação salva da tabela do TMA (/reports/tma), armazenada em
 * `gestor_config_fantasia.ordem_tabela_tma` — mesma tabela usada pelo
 * consolidado (ordem_tabela) e por tempo logado/indisponibilidade
 * (ordem_tabela_tempo_indisp), mas em COLUNA PRÓPRIA. A meta do TMA continua
 * em `kpi_gestor_metas.tma` (compartilhada com o KPI mensal) — não mexe aqui.
 */
export async function getConfigTabelaTma(gestorId: string): Promise<OrdemTabelaTma> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("gestor_config_fantasia")
    .select("ordem_tabela_tma")
    .eq("gestor_id", gestorId)
    .maybeSingle();

  if (error) {
    console.error("[getConfigTabelaTma] erro:", error.message);
  }

  return data?.ordem_tabela_tma && isOrdemTabelaTma(data.ordem_tabela_tma)
    ? data.ordem_tabela_tma
    : DEFAULT_ORDEM_TABELA_TMA;
}
