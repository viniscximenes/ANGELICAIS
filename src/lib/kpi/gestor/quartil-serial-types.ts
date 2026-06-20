import type { KpiDefinition } from "@/lib/kpi/types";

import type { QuartilData, QuartilResultado } from "./compute-quartis";

/** Slugs exibidos na tabela de quartil (subconjunto dos ranqueáveis). */
export const QUARTIL_SLUGS_ORDER = [
  "tx_retencao_bruta",
  "indisp_total",
  "tma",
  "abs",
  "transfer",
  "short_call",
  "rechamada_d7",
] as const;

export type KpiQuartilSerial = {
  slug: string;
  displayName: string;
  valueType: KpiDefinition["valueType"];
  valor: number | null;
  quartil: QuartilResultado | null;
};

export type OperadorQuartilSerial = {
  email: string;
  nome: string;
  kpis: KpiQuartilSerial[];
};

export type QuartilEquipeSerial = {
  operadores: OperadorQuartilSerial[];
  mesRef: string;
  dataCorte?: string | null;
};

/**
 * Converte QuartilData (Maps não-serializáveis) para forma plana para cruzar
 * o boundary server → client em Next.js.
 *
 * Só inclui os 13 slugs ranqueáveis em QUARTIL_SLUGS_ORDER; informativos
 * (variacao_ticket, pessoal, outras_pausas) são omitidos.
 */
export function toQuartilEquipeSerial(
  data: QuartilData,
  definitions: KpiDefinition[],
): QuartilEquipeSerial {
  const defMap = new Map(definitions.map((d) => [d.slug, d]));
  const ranqueableSet = new Set(data.ranqueableSlugs);

  const slugsOrdenados = QUARTIL_SLUGS_ORDER.filter(
    (slug) => defMap.has(slug) && ranqueableSet.has(slug),
  );

  return {
    mesRef: data.mesRef,
    dataCorte: data.dataCorte,
    operadores: data.operadores.map((op) => ({
      email: op.email,
      nome: op.nome,
      kpis: slugsOrdenados.map((slug) => {
        const def = defMap.get(slug)!;
        return {
          slug,
          displayName: def.displayName,
          valueType: def.valueType,
          valor: op.valores.get(slug) ?? null,
          quartil: op.quartis.get(slug) ?? null,
        };
      }),
    })),
  };
}
