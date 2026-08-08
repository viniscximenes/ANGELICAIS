import type { EnrichedKpiValue } from "@/lib/kpi/atual/types";
import type { KpiDefinition, KpiValueType } from "@/lib/kpi/types";

import {
  computeRetidosBrutos,
  RETIDOS_BRUTOS_SLUG,
  VIRTUAL_KPI_LABELS,
} from "./retidos-brutos";
import type { KpiEquipeGestorData } from "./types";

/**
 * Ordem de exibição das colunas na tabela (KPIs principais).
 *
 * `retidos_brutos` é virtual (pedidos − churn) e não tem linha em
 * kpi_definitions — é montado à parte em toKpiEquipeSerial.
 */
export const PRINCIPAL_SLUGS_ORDER = [
  "tx_retencao_bruta",
  RETIDOS_BRUTOS_SLUG,
  "indisp_total",
  "tma",
  "abs",
  "churn",
  "pedidos",
  "variacao_ticket",
] as const;

/** Ordem de exibição dos cards no modal (KPIs secundários). */
export const SECUNDARIO_SLUGS_ORDER = [
  "tx_retencao_liquida_15d",
  "atendidas",
  "transfer",
  "short_call",
  "rechamada_d7",
  "csat",
  "nr17",
  "pessoal",
  "outras_pausas",
] as const;

export type KpiCelulaSerial = {
  slug: string;
  displayName: string;
  valor: number | null;
  valueType: KpiValueType;
  status: "success" | "warning" | "danger" | "neutral";
};

export type OperadorKpiSerial = {
  email: string;
  nome: string;
  kpis: KpiCelulaSerial[];        // principais — colunas da tabela
  secundarios: KpiCelulaSerial[]; // secundários — modal de detalhe
};

export type KpiEquipeSerial = {
  operadores: OperadorKpiSerial[];
  mesRef: string;
  isMesPassado: boolean;
  dataCorte: string | null;
};

/**
 * Converte KpiEquipeGestorData (Maps não-serializáveis) para forma plana
 * para cruzar o boundary server → client em Next.js.
 */
export function toKpiEquipeSerial(
  data: KpiEquipeGestorData,
  definitions: KpiDefinition[],
): KpiEquipeSerial {
  const principalDefs = definitions.filter((d) => d.groupType === "principal");
  const secundarioDefs = definitions.filter((d) => d.groupType === "secundario");

  const orderedSecundario = SECUNDARIO_SLUGS_ORDER
    .map((slug) => secundarioDefs.find((d) => d.slug === slug))
    .filter((d): d is KpiDefinition => d !== undefined);

  const toCelula = (
    map: (typeof data.operadores)[0]["kpisPrincipal"],
    def: KpiDefinition,
  ): KpiCelulaSerial => {
    const kpi = map.get(def.slug);
    const status: KpiCelulaSerial["status"] =
      kpi && "status" in kpi ? (kpi as EnrichedKpiValue).status : "neutral";
    return {
      slug: def.slug,
      displayName: def.displayName,
      valor: kpi?.valor ?? null,
      valueType: def.valueType,
      status,
    };
  };

  /**
   * Célula do KPI virtual "Retidos Brutos" (pedidos − churn). Sem linha em
   * kpi_definitions não há meta nem faixa de cor, então o status é sempre
   * "neutral" — a coluna mostra o número, não o semáforo.
   */
  const toCelulaRetidosBrutos = (
    map: (typeof data.operadores)[0]["kpisPrincipal"],
  ): KpiCelulaSerial => ({
    slug: RETIDOS_BRUTOS_SLUG,
    displayName: VIRTUAL_KPI_LABELS[RETIDOS_BRUTOS_SLUG],
    valor: computeRetidosBrutos(
      map.get("pedidos")?.valor,
      map.get("churn")?.valor,
    ),
    valueType: "number",
    status: "neutral",
  });

  /**
   * Monta as células principais seguindo PRINCIPAL_SLUGS_ORDER, tratando o
   * slug virtual à parte. Slugs sem definição no banco são pulados (mesmo
   * comportamento de antes).
   */
  const buildPrincipais = (
    map: (typeof data.operadores)[0]["kpisPrincipal"],
  ): KpiCelulaSerial[] => {
    const cells: KpiCelulaSerial[] = [];
    for (const slug of PRINCIPAL_SLUGS_ORDER) {
      if (slug === RETIDOS_BRUTOS_SLUG) {
        cells.push(toCelulaRetidosBrutos(map));
        continue;
      }
      const def = principalDefs.find((d) => d.slug === slug);
      if (def) cells.push(toCelula(map, def));
    }
    return cells;
  };

  return {
    mesRef: data.mesRef,
    isMesPassado: data.isMesPassado,
    dataCorte: data.dataCorte,
    operadores: data.operadores.map((op) => ({
      email: op.email,
      nome: op.nome,
      kpis: buildPrincipais(op.kpisPrincipal),
      secundarios: orderedSecundario.map((def) => toCelula(op.kpisSecundario, def)),
    })),
  };
}
