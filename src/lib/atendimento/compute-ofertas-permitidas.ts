import type { RegraDesconto } from "@/lib/config/planos/types";

import type { OfertaPermitida } from "./types";

/**
 * Dado:
 * - tempoClienteMeses: quantos meses o cliente tem
 * - regras: lista de regras ativas
 *
 * Retorna combinações { descontoMaxPct, duracaoMeses } compatíveis com
 * o cliente.
 *
 * IMPORTANTE: hoje filtramos APENAS regras com tem_ott = false. Quando o
 * sistema voltar a usar OTT, adicionar o parâmetro temOttDoPlano e
 * descomentar a lógica de filtro por OTT.
 */
export function computeOfertasPermitidas(
  tempoClienteMeses: number,
  regras: RegraDesconto[],
): OfertaPermitida[] {
  if (tempoClienteMeses < 0) return [];

  return regras
    .filter((r) => {
      if (r.temOtt) return false; // só regras sem OTT por enquanto
      if (tempoClienteMeses < r.tempoMinMeses) return false;
      if (
        r.tempoMaxMeses !== null &&
        tempoClienteMeses > r.tempoMaxMeses
      ) {
        return false;
      }
      return true;
    })
    .map((r) => ({
      descontoMaxPct: r.descontoMaxPct,
      duracaoMeses: r.duracaoMeses,
    }));
}
