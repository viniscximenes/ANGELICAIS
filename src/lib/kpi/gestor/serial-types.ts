import type { EnrichedKpiValue } from "@/lib/kpi/atual/types";
import type { KpiDefinition, KpiValueType } from "@/lib/kpi/types";

import type { KpiEquipeGestorData } from "./types";

/** Ordem de exibição das colunas na tabela (KPIs principais). */
export const PRINCIPAL_SLUGS_ORDER = [
  "tx_retencao_bruta",
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

function serializeCelula(
  map: ReturnType<typeof Map.prototype.get> extends infer T ? Map<string, NonNullable<T>> : never,
  def: KpiDefinition,
): KpiCelulaSerial {
  // TypeScript workaround: map is typed as Map<string, EnrichedKpiValue | NeutralKpiValue>
  return {} as KpiCelulaSerial; // placeholder — see below
}

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

  const orderedPrincipal = PRINCIPAL_SLUGS_ORDER
    .map((slug) => principalDefs.find((d) => d.slug === slug))
    .filter((d): d is KpiDefinition => d !== undefined);

  const orderedSecundario = SECUNDARIO_SLUGS_ORDER
    .map((slug) => secundarioDefs.find((d) => d.slug === slug))
    .filter((d): d is KpiDefinition => d !== undefined);

  const toCelula = (
    map: ReturnType<(typeof data.operadores)[0]["kpisPrincipal"]["get"]> extends infer _ ? (typeof data.operadores)[0]["kpisPrincipal"] : never,
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

  return {
    mesRef: data.mesRef,
    isMesPassado: data.isMesPassado,
    dataCorte: data.dataCorte,
    operadores: data.operadores.map((op) => ({
      email: op.email,
      nome: op.nome,
      kpis: orderedPrincipal.map((def) => toCelula(op.kpisPrincipal, def)),
      secundarios: orderedSecundario.map((def) => toCelula(op.kpisSecundario, def)),
    })),
  };
}
