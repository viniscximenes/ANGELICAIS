/**
 * "Retidos Brutos" é um KPI VIRTUAL: não existe em kpi_definitions nem em
 * kpi_monthly_snapshots. É sempre derivado de `pedidos − churn`, a mesma
 * fórmula já usada em:
 *   - src/lib/rv/calculate-rv.ts (countSource "derived_retido")
 *   - src/lib/atendimento/get-performance-operador.ts
 *   - src/lib/evolucao/compute-consolidado.ts
 *
 * Existe apenas no caminho do gestor (/operacional/kpi). NÃO é injetado em
 * getKpiDefinitions() de propósito: aquela lista alimenta /config/kpi (que
 * edita e grava por `id` real) e os processadores de snapshot — um registro
 * sintético lá viraria um card ineditável e poderia bagunçar o mapeamento
 * de cabeçalhos na importação.
 */

export const RETIDOS_BRUTOS_SLUG = "retidos_brutos";

/**
 * Labels dos KPIs virtuais, para as telas que resolvem nome de coluna a
 * partir de kpi_definitions e não encontrariam este slug.
 */
export const VIRTUAL_KPI_LABELS: Record<string, string> = {
  [RETIDOS_BRUTOS_SLUG]: "Retidos Brutos",
};

/**
 * Retidos brutos = pedidos − churn, nunca negativo (mesmo clamp de
 * calculate-rv.ts). Retorna null se qualquer um dos dois faltar — assim a
 * célula mostra "—" em vez de um zero enganoso.
 */
export function computeRetidosBrutos(
  pedidos: number | null | undefined,
  churn: number | null | undefined,
): number | null {
  if (pedidos === null || pedidos === undefined) return null;
  if (churn === null || churn === undefined) return null;
  return Math.max(pedidos - churn, 0);
}
