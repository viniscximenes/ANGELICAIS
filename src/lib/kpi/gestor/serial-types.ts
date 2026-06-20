import type { EnrichedKpiValue } from "@/lib/kpi/atual/types";
import type { KpiDefinition, KpiValueType } from "@/lib/kpi/types";

import type { KpiEquipeGestorData } from "./types";

/** Ordem de exibição das colunas na tabela da equipe. */
export const PRINCIPAL_SLUGS_ORDER = [
  "tx_retencao_bruta",
  "indisp_total",
  "tma",
  "abs",
  "churn",
  "pedidos",
  "variacao_ticket",
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
  kpis: KpiCelulaSerial[];
};

export type KpiEquipeSerial = {
  operadores: OperadorKpiSerial[];
  mesRef: string;
  isMesPassado: boolean;
  dataCorte: string | null;
};

/**
 * Converte KpiEquipeGestorData (Map não-serializável) para forma serializável
 * para cruzar o boundary server → client em Next.js.
 * Respeita PRINCIPAL_SLUGS_ORDER para a ordem das colunas.
 */
export function toKpiEquipeSerial(
  data: KpiEquipeGestorData,
  principalDefs: KpiDefinition[],
): KpiEquipeSerial {
  // Reordena principalDefs pela ordem visual desejada.
  const orderedDefs = PRINCIPAL_SLUGS_ORDER
    .map((slug) => principalDefs.find((d) => d.slug === slug))
    .filter((d): d is KpiDefinition => d !== undefined);

  return {
    mesRef: data.mesRef,
    isMesPassado: data.isMesPassado,
    dataCorte: data.dataCorte,
    operadores: data.operadores.map((op) => ({
      email: op.email,
      nome: op.nome,
      kpis: orderedDefs.map((def) => {
        const kpi = op.kpis.get(def.slug);
        const status: KpiCelulaSerial["status"] =
          kpi && "status" in kpi
            ? (kpi as EnrichedKpiValue).status
            : "neutral";
        return {
          slug: def.slug,
          displayName: def.displayName,
          valor: kpi?.valor ?? null,
          valueType: def.valueType,
          status,
        };
      }),
    })),
  };
}
