import { formatKpiValue } from "@/lib/kpi/atual/format-kpi-value";
import type { EnrichedKpiValue } from "@/lib/kpi/atual/types";
import type { KpiDefinition } from "@/lib/kpi/types";

import { getKpiEquipePorEmails } from "./get-kpi-equipe-gestor";
import type { DefasadosInfo } from "./gestor-proprio-types";
import { getOperadoresDoGestor } from "./get-operadores-do-gestor";

/**
 * Para cada KPI com meta (coloring != "none"), retorna a lista de operadores
 * da equipe que estão defasados (status danger), ordenados do pior ao menos pior.
 *
 * Avalia com as metas de OPERADOR (kpi_definitions) — não as de gestor.
 * Só faz sentido para o mês atual.
 */
export async function getDefasadosPorKpi(
  fullName: string,
  mesRef: string,
  definitions: KpiDefinition[],
): Promise<Map<string, DefasadosInfo>> {
  const result = new Map<string, DefasadosInfo>();

  for (const def of definitions) {
    result.set(def.slug, { temMeta: def.coloringType !== "none", defasados: [] });
  }

  const emails = await getOperadoresDoGestor(fullName, mesRef);
  if (emails.length === 0) return result;

  const equipe = await getKpiEquipePorEmails(emails, definitions, mesRef, false);

  for (const def of definitions) {
    if (def.coloringType === "none") continue;

    const raw: { user: string; valor: string; rawVal: number }[] = [];

    for (const op of equipe.operadores) {
      const kpiMap =
        def.groupType === "principal" ? op.kpisPrincipal : op.kpisSecundario;
      const kpi = kpiMap.get(def.slug);

      if (!kpi || kpi.valor === null) continue;
      if (!("status" in kpi)) continue;
      if ((kpi as EnrichedKpiValue).status !== "danger") continue;

      raw.push({
        user: op.email.split("@")[0],
        valor: formatKpiValue(kpi.valor, def.valueType),
        rawVal: kpi.valor,
      });
    }

    // Sort worst first:
    // lower_better → higher value is worse (sort descending)
    // higher_better / three_tier → lower value is worse (sort ascending)
    raw.sort((a, b) =>
      def.direction === "lower_better"
        ? b.rawVal - a.rawVal
        : a.rawVal - b.rawVal,
    );

    result.set(def.slug, {
      temMeta: true,
      defasados: raw.map(({ user, valor }) => ({ user, valor })),
    });
  }

  return result;
}
