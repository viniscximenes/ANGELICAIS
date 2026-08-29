import { enrichWithDefinitions } from "@/lib/kpi/atual/enrich-with-definitions";
import { getKpiDefinitions } from "@/lib/kpi/get-definitions";
import type { KpiDefinition, KpiValueType } from "@/lib/kpi/types";
import { getDatePartsInBR } from "@/lib/utils/format-datetime-br";

import { formatMesRefCurto } from "./format-mes-ref";
import { getHistoricoOperador } from "./get-historico-operador";
import {
  getQuartisHistoricoOperador,
  type QuartilPonto,
} from "./get-quartis-historico";
import { resolveMesRefInicial, type Periodo } from "./periodo";

type StatusKpi = "success" | "warning" | "danger" | "neutral";

export type PontoSerie = {
  mesRef: string;
  label: string;
  valor: number | null;
  status: StatusKpi;
  /** Meta "por linha" quando o KPI é per_row (pedidos → forecast_pedidos, churn → forecast_churn). */
  metaPonto: number | null;
  /** Q1 (melhor) … Q4 (pior). null quando o KPI não é ranqueável ou o operador não tem valor no mês. */
  quartil: 1 | 2 | 3 | 4 | null;
};

export type KpiSerie = {
  slug: string;
  displayName: string;
  valueType: KpiValueType;
  direction: KpiDefinition["direction"];
  grupo: "principal" | "secundario";
  /** Linha de referência fixa (binary → threshold_red; three_tier → threshold_yellow). null quando não se aplica. */
  metaLinha: number | null;
  /** true para KPIs principais ranqueáveis (higher_better | lower_better) — os que exibem faixa de quartil. */
  temQuartil: boolean;
  pontos: PontoSerie[];
};

export type AnaliseOperadorSerial = {
  operatorEmail: string;
  periodo: Periodo;
  /** Meses (YYYY-MM-01) exibidos, em ordem crescente. Já respeita `incluirMesAtual`. */
  meses: string[];
  mesMaisRecenteDisponivel: string | null;
  /** Mês calendário corrente (YYYY-MM-01, Brasília) — o "mês atual ainda não fechado". */
  mesAtualRef: string;
  /** Se o mês atual estava entre os dados do período (antes de eventual exclusão). */
  mesAtualTinhaDado: boolean;
  incluirMesAtual: boolean;
  principais: KpiSerie[];
  secundarios: KpiSerie[];
};

/** `YYYY-MM-01` do mês calendário corrente em Brasília. */
export function mesRefAtual(): string {
  const { year, month } = getDatePartsInBR();
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function metaLinhaDaDefinicao(def: KpiDefinition): number | null {
  if (def.coloringType === "binary") return def.thresholdRed;
  if (def.coloringType === "three_tier") {
    return def.thresholdYellow ?? def.thresholdRed;
  }
  return null;
}

function isRanqueavel(def: KpiDefinition): boolean {
  return def.direction === "higher_better" || def.direction === "lower_better";
}

/**
 * Monta o payload serializável do relatório de um operador: para cada KPI
 * (principais e secundários de kpi_definitions), a série mensal de valor +
 * status (mesmo semáforo do resto do site, via enrichWithDefinitions) e,
 * nos principais ranqueáveis, o quartil do operador naquele mês contra
 * TODOS os operadores da empresa.
 *
 * Reaproveitado pelo Server Component (carga inicial) e pela Server Action
 * (troca de seletor) — a lógica de agregação mora aqui, não duplicada.
 */
export async function buildAnaliseOperadorSerial(params: {
  operatorEmailCandidates: string[];
  periodo: Periodo;
  mesMaisRecenteDisponivel: string | null;
  /** default true — inclui o mês calendário corrente (ainda não fechado) no histórico/quartil/média. */
  incluirMesAtual?: boolean;
}): Promise<AnaliseOperadorSerial> {
  const { operatorEmailCandidates, periodo, mesMaisRecenteDisponivel } = params;
  const incluirMesAtual = params.incluirMesAtual ?? true;
  const mesAtualRef = mesRefAtual();

  const primaryEmail = operatorEmailCandidates[0] ?? "";

  if (!mesMaisRecenteDisponivel) {
    return {
      operatorEmail: primaryEmail,
      periodo,
      meses: [],
      mesMaisRecenteDisponivel: null,
      mesAtualRef,
      mesAtualTinhaDado: false,
      incluirMesAtual,
      principais: [],
      secundarios: [],
    };
  }

  const mesRefInicial = resolveMesRefInicial(mesMaisRecenteDisponivel, periodo);
  const definitions = await getKpiDefinitions();

  const principaisDefs = definitions
    .filter((d) => d.groupType === "principal")
    .sort((a, b) => a.displayOrder - b.displayOrder);
  const secundariosDefs = definitions
    .filter((d) => d.groupType === "secundario")
    .sort((a, b) => a.displayOrder - b.displayOrder);
  const ranqueaveisDefs = principaisDefs.filter(isRanqueavel);

  const [historico, quartis] = await Promise.all([
    getHistoricoOperador({ operatorEmailCandidates, mesRefInicial }),
    getQuartisHistoricoOperador({
      operatorEmailCandidates,
      mesRefInicial,
      ranqueaveisDefs,
    }),
  ]);

  const mesesComDado = [...historico.porMes.keys()].sort();
  const mesAtualTinhaDado = mesesComDado.includes(mesAtualRef);

  // Toggle "Incluir mês atual (ainda não fechado)": quando desligado, o mês
  // calendário corrente some do histórico, do quartil e da média — como se
  // não existisse no período.
  const meses = incluirMesAtual
    ? mesesComDado
    : mesesComDado.filter((m) => m !== mesAtualRef);

  const buildSerie = (
    def: KpiDefinition,
    grupo: "principal" | "secundario",
  ): KpiSerie => {
    const ranqueavel = grupo === "principal" && isRanqueavel(def);

    const pontos: PontoSerie[] = meses.map((mesRef) => {
      const valuesBySlug = historico.porMes.get(mesRef) ?? new Map();

      const enriched = enrichWithDefinitions(
        definitions,
        valuesBySlug,
        {
          forecastPedidos: valuesBySlug.get("forecast_pedidos") ?? null,
          forecastChurn: valuesBySlug.get("forecast_churn") ?? null,
          txRetencaoBruta: valuesBySlug.get("tx_retencao_bruta") ?? null,
        },
        grupo,
      );
      const cell = enriched.get(def.slug);

      const quartilMes: QuartilPonto | undefined = ranqueavel
        ? quartis.get(mesRef)?.get(def.slug)
        : undefined;

      return {
        mesRef,
        label: formatMesRefCurto(mesRef),
        valor: cell?.valor ?? valuesBySlug.get(def.slug) ?? null,
        status: cell?.status ?? "neutral",
        metaPonto: cell?.metaPorLinha ?? null,
        quartil: quartilMes ? quartilMes.quartil : null,
      };
    });

    return {
      slug: def.slug,
      displayName: def.displayName,
      valueType: def.valueType,
      direction: def.direction,
      grupo,
      metaLinha: metaLinhaDaDefinicao(def),
      temQuartil: ranqueavel,
      pontos,
    };
  };

  return {
    operatorEmail: primaryEmail,
    periodo,
    meses,
    mesMaisRecenteDisponivel,
    mesAtualRef,
    mesAtualTinhaDado,
    incluirMesAtual,
    principais: principaisDefs.map((d) => buildSerie(d, "principal")),
    secundarios: secundariosDefs.map((d) => buildSerie(d, "secundario")),
  };
}
