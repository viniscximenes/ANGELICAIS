import { createClient } from "@/lib/supabase/server";

import {
  DEFAULT_META_INDISPONIBILIDADE,
  DEFAULT_ORDEM_TABELA_TEMPO_INDISP,
  isOrdemTabelaTempoIndisp,
  type ConfigTabelaTempoIndisp,
} from "./types";

/**
 * Config de exibição da tabela unificada de Tempo Logado & Indisponibilidade
 * (meta de Indisp.% + ordenação), armazenada em `gestor_config_fantasia` —
 * mesma tabela usada por nome fantasia e pela config do consolidado, mas em
 * COLUNAS PRÓPRIAS (meta_indisponibilidade, ordem_tabela_tempo_indisp),
 * dedicadas a esta página. Não reaproveita `meta_tx_retencao`/`ordem_tabela`
 * (exclusivas do consolidado) nem `kpi_gestor_metas.indisp_total` (KPI
 * mensal, domínio diferente).
 */
export async function getConfigTabelaTempoIndisp(gestorId: string): Promise<ConfigTabelaTempoIndisp> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("gestor_config_fantasia")
    .select("meta_indisponibilidade, ordem_tabela_tempo_indisp")
    .eq("gestor_id", gestorId)
    .maybeSingle();

  if (error) {
    console.error("[getConfigTabelaTempoIndisp] erro:", error.message);
  }

  const metaIndisponibilidade =
    data?.meta_indisponibilidade !== null && data?.meta_indisponibilidade !== undefined
      ? Number(data.meta_indisponibilidade)
      : DEFAULT_META_INDISPONIBILIDADE;

  const ordemTabela =
    data?.ordem_tabela_tempo_indisp && isOrdemTabelaTempoIndisp(data.ordem_tabela_tempo_indisp)
      ? data.ordem_tabela_tempo_indisp
      : DEFAULT_ORDEM_TABELA_TEMPO_INDISP;

  return { metaIndisponibilidade, ordemTabela };
}
