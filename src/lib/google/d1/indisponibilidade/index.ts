import { fetchIndisp } from "./indisp-sheet";
import { fetchPausa } from "./pausa-sheet";
import type { IndisponibilidadeData } from "./types";

export type * from "./types";
export { fetchIndisp, fetchPausa };
export { parsePercent, sumTimes } from "./parse";

export async function getIndisponibilidadeData(): Promise<IndisponibilidadeData> {
  const [indispResult, pausas] = await Promise.all([
    fetchIndisp(),
    fetchPausa(),
  ]);

  return {
    operadoresIndisp: indispResult.operadores,
    operadoresPausa: pausas,
    horaReport: indispResult.horaReport,
  };
}
