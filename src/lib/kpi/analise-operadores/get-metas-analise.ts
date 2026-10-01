import { createClient } from "@/lib/supabase/server";
import { getKpiDefinitions } from "@/lib/kpi/get-definitions";

import { PRINCIPAIS_SLUGS, TX_RETENCAO_SLUG } from "./constants";
import {
  buildMetasAnalise,
  type MetaAnaliseKpi,
  type MetasOverrideAnalise,
} from "./metas-analise";

/**
 * Overrides de meta do relatório /kpi/evolucao (gestor_config_fantasia):
 * - Tx. Retenção Bruta → analise_meta_tx_retencao (coluna original);
 * - TMA, ABS, Indisp Total → analise_metas_kpi (jsonb slug → número).
 *
 * Só os KPIs com meta salva entram no resultado — o resto usa
 * kpi_definitions. Não é lido por nenhuma outra tela.
 */
export async function getAnaliseMetasOverrides(
  gestorId: string,
): Promise<MetasOverrideAnalise> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("gestor_config_fantasia")
    .select("analise_meta_tx_retencao, analise_metas_kpi")
    .eq("gestor_id", gestorId)
    .maybeSingle();

  if (error) {
    console.error("[getAnaliseMetasOverrides] erro:", error.message);
    return {};
  }

  const overrides: MetasOverrideAnalise = {};

  const tx = data?.analise_meta_tx_retencao;
  if (tx !== null && tx !== undefined && Number.isFinite(Number(tx))) {
    overrides[TX_RETENCAO_SLUG] = Number(tx);
  }

  const outros = (data?.analise_metas_kpi ?? null) as Record<string, unknown> | null;
  if (outros && typeof outros === "object") {
    for (const slug of PRINCIPAIS_SLUGS) {
      if (slug === TX_RETENCAO_SLUG) continue;
      const v = outros[slug];
      if (v !== null && v !== undefined && Number.isFinite(Number(v))) {
        overrides[slug] = Number(v);
      }
    }
  }

  return overrides;
}

/** Metas efetivas dos KPIs principais (override ?? padrão) do gestor. */
export async function getMetasAnalise(gestorId: string): Promise<MetaAnaliseKpi[]> {
  const [definitions, overrides] = await Promise.all([
    getKpiDefinitions(),
    getAnaliseMetasOverrides(gestorId),
  ]);
  return buildMetasAnalise(definitions, overrides);
}
