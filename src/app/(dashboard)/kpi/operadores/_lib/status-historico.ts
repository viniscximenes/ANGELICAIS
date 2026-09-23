import { enrichWithDefinitions } from "@/lib/kpi/atual/enrich-with-definitions";
import type { KpiDefinition } from "@/lib/kpi/types";
import type { KpiCelulaSerial, OperadorKpiSerial } from "@/lib/kpi/gestor/serial-types";

/**
 * Recolore as células de meses ANTIGOS (passado, retrasado e históricos)
 * reaproveitando `enrichWithDefinitions` — a MESMA função que
 * get-kpi-equipe-gestor.ts (lib/kpi/gestor/*, não alterado) chama pra
 * calcular o status do mês ATUAL. Não é uma réplica: é a função original,
 * importada (pura, sem I/O) — fonte: src/lib/kpi/atual/enrich-with-definitions.ts.
 *
 * Roda no CLIENT, sobre os dados já enviados ao componente (KpiCelulaSerial
 * só traz `valor` por slug pra meses antigos — toKpiEquipeSerial, lib/kpi/gestor/*,
 * marca todo mês antigo como "neutral" de propósito, ver get-kpi-equipe-gestor.ts).
 * `definitions` (kpi_definitions, com os thresholds atuais) chega via prop —
 * já era buscada em page.tsx (getKpiDefinitions), só não estava sendo repassada
 * ao client. Nenhuma action foi alterada.
 *
 * Limitação conhecida e reportada: "Pedidos" e "Churn" são coloring_type
 * "per_row" — a meta é o forecast do PRÓPRIO operador no mês
 * (forecast_pedidos/forecast_churn), que não chega ao client pra meses
 * antigos (só o valor das colunas visíveis é serializado). Sem essa meta,
 * enrichWithDefinitions já degrada pra "neutral" — mesmo comportamento do
 * mês atual quando a meta está ausente (ver enrich-with-definitions.ts,
 * computeStatus/case "per_row") — então essas duas colunas continuam
 * neutras nos meses antigos, exatamente como "Retidos Brutos" (que não tem
 * kpi_definitions e por isso nunca teria como colorir).
 */
function recolorirCelulas(kpis: KpiCelulaSerial[], definitions: KpiDefinition[]): KpiCelulaSerial[] {
  const valuesBySlug = new Map<string, number | null>();
  for (const c of kpis) valuesBySlug.set(c.slug, c.valor);

  const extra = {
    forecastPedidos: null,
    forecastChurn: null,
    txRetencaoBruta: valuesBySlug.get("tx_retencao_bruta") ?? null,
  };

  const enriched = enrichWithDefinitions(definitions, valuesBySlug, extra, "principal");
  for (const [slug, val] of enrichWithDefinitions(definitions, valuesBySlug, extra, "secundario")) {
    enriched.set(slug, val);
  }

  return kpis.map((c) => {
    const e = enriched.get(c.slug);
    // Sem definição pro slug (ex.: retidos_brutos, virtual) — mantém como veio (neutral).
    if (!e) return c;
    return { ...c, status: e.status };
  });
}

export function recolorirOperadoresHistorico(
  operadores: OperadorKpiSerial[],
  definitions: KpiDefinition[],
): OperadorKpiSerial[] {
  return operadores.map((op) => ({
    ...op,
    kpis: recolorirCelulas(op.kpis, definitions),
    secundarios: recolorirCelulas(op.secundarios, definitions),
  }));
}
