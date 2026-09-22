import { createClient } from "@/lib/supabase/server";
import { metaMmSsParaSegundos, statusTmaDe, type TmaStatus, type TmaThresholdConfig } from "./tma-status-pure";

// Reexport — mantém a mesma API pública deste módulo pros chamadores
// existentes (get-gestor-tma.ts, get-gestor-tma-analitico.ts,
// get-gestor-tma-evolucao-hora.ts, etc.), sem forçar todo mundo a trocar de
// import. A implementação real (pura, sem next/headers) vive em
// tma-status-pure.ts — extraída nesta rodada porque calcularEvolucaoTmaPorHora
// (get-gestor-tma-evolucao-hora.ts) agora também é chamada de dentro de um
// componente client (tma-detalhe-dialog.tsx), e o import de createClient
// (next/headers) neste arquivo quebra o bundle client se qualquer coisa no
// caminho de import chegar até aqui. Só ESTE arquivo (que faz a query em
// gestor_config_fantasia/kpi_definitions) continua server-only; a lógica pura
// de threshold/status fica isolada, seguro pra importar de qualquer lado.
export { metaMmSsParaSegundos, statusTmaDe, type TmaStatus, type TmaThresholdConfig };

/**
 * Threshold + direção efetivos do TMA pra um gestor — MESMA fonte de verdade
 * usada pra colorir a tabela principal (/reports/tma) e agora também o card
 * "TMA" do Analítico: threshold_red/direction de kpi_definitions (slug
 * "tma"), com override opcional em
 * gestor_config_fantasia.kpi_gestor_metas.tma. Extraído de get-gestor-tma.ts
 * (que fazia essa mesma leitura/cálculo inline) pra get-gestor-tma.ts e
 * get-gestor-tma-analitico.ts importarem daqui, sem duplicar a lógica.
 *
 * Faz sua PRÓPRIA query em gestor_config_fantasia (só a coluna
 * kpi_gestor_metas) — get-gestor-tma.ts já faz outra query nessa mesma
 * tabela pra ordem_tabela_tma; são round-trips separados de propósito (a
 * alternativa seria passar o config já buscado como parâmetro, o que
 * acoplaria esta função ao formato exato da query de cada chamador).
 */
export async function getTmaThresholdConfig(gestorId: string): Promise<TmaThresholdConfig> {
  const supabase = await createClient();

  const [{ data: kpiDef }, { data: config }] = await Promise.all([
    supabase.from("kpi_definitions").select("threshold_red, direction").eq("slug", "tma").maybeSingle(),
    supabase.from("gestor_config_fantasia").select("kpi_gestor_metas").eq("gestor_id", gestorId).maybeSingle(),
  ]);

  const thresholdDefault =
    kpiDef?.threshold_red !== null && kpiDef?.threshold_red !== undefined ? Number(kpiDef.threshold_red) : null;
  const direction = (kpiDef?.direction ?? "lower_better") as TmaThresholdConfig["direction"];

  const metasGestor = (config?.kpi_gestor_metas ?? {}) as Record<string, { meta?: unknown }>;
  const thresholdOverride = metaMmSsParaSegundos(metasGestor.tma?.meta);
  const threshold = thresholdOverride ?? thresholdDefault;

  return { threshold, direction };
}
