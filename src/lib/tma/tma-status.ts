import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { metaMmSsParaSegundos, statusTmaDe, type TmaStatus, type TmaThresholdConfig } from "./tma-status-pure";

// Reexport: os chamadores do servidor (get-gestor-tma.ts,
// get-gestor-tma-analitico.ts…) importam tudo daqui. A lógica pura de
// threshold/status vive em tma-status-pure.ts porque também roda no client
// (tma-detalhe-dialog.tsx chama calcularEvolucaoTmaPorHora) — e este arquivo
// importa createClient (next/headers), que quebra o bundle client. Regra:
// componente client importa de tma-status-pure.ts, nunca daqui.
export { metaMmSsParaSegundos, statusTmaDe, type TmaStatus, type TmaThresholdConfig };

/**
 * Threshold + direção efetivos do TMA pra um gestor — MESMA fonte de verdade
 * usada pra colorir a tabela principal (/s/reports/tma-peso) e agora também o card
 * "TMA" do Analítico: threshold_red/direction de kpi_definitions (slug
 * "tma"), com override opcional em
 * gestor_config_fantasia.kpi_gestor_metas.tma. Extraído de get-gestor-tma.ts
 * (que fazia essa mesma leitura/cálculo inline) pra get-gestor-tma.ts e
 * get-gestor-tma-analitico.ts importarem daqui, sem duplicar a lógica.
 *
 * A linha do gestor em gestor_config_fantasia vem de getConfigGestorTma
 * (abaixo), a MESMA leitura que getGestorTma usa pra ordem_tabela_tma —
 * antes eram duas consultas separadas à mesma linha por carregamento.
 *
 * cache() do React: getGestorTma e getGestorTmaAnalitico pedem o mesmo
 * config na mesma requisição — consulta uma vez só.
 */
/**
 * Linha do gestor em gestor_config_fantasia com as colunas que o TMA usa
 * (meta em kpi_gestor_metas e ordem_tabela_tma). cache() do React: uma
 * consulta só por requisição, compartilhada por getTmaThresholdConfig e
 * getGestorTma.
 */
export const getConfigGestorTma = cache(async function getConfigGestorTma(gestorId: string) {
  const supabase = await createClient();
  return supabase
    .from("gestor_config_fantasia")
    .select("kpi_gestor_metas, ordem_tabela_tma")
    .eq("gestor_id", gestorId)
    .maybeSingle();
});

export const getTmaThresholdConfig = cache(async function getTmaThresholdConfig(
  gestorId: string,
): Promise<TmaThresholdConfig & { erro: boolean }> {
  const supabase = await createClient();

  const [{ data: kpiDef, error: erroKpi }, { data: config, error: erroConfig }] = await Promise.all([
    supabase.from("kpi_definitions").select("threshold_red, direction").eq("slug", "tma").maybeSingle(),
    getConfigGestorTma(gestorId),
  ]);

  const thresholdDefault =
    kpiDef?.threshold_red !== null && kpiDef?.threshold_red !== undefined ? Number(kpiDef.threshold_red) : null;
  const direction = (kpiDef?.direction ?? "lower_better") as TmaThresholdConfig["direction"];

  const metasGestor = (config?.kpi_gestor_metas ?? {}) as Record<string, { meta?: unknown }>;
  const thresholdOverride = metaMmSsParaSegundos(metasGestor.tma?.meta);
  const threshold = thresholdOverride ?? thresholdDefault;

  // Falha de leitura: o fallback (threshold null) pintaria tudo de neutro,
  // como "sem meta configurada". `erro` deixa o chamador tratar como erro.
  if (erroKpi || erroConfig) {
    console.error("[getTmaThresholdConfig] erro ao ler meta do TMA:", (erroKpi ?? erroConfig)?.message);
  }

  return { threshold, direction, erro: Boolean(erroKpi || erroConfig) };
});
