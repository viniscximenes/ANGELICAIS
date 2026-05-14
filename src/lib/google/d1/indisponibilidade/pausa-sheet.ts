import { getSheetsClient } from "../../sheets-client";
import { parseTimeHHMMSS } from "../tempo-logado/parse";
import { sumTimes } from "./parse";
import type { OperadorPausa } from "./types";

export async function fetchPausa(): Promise<OperadorPausa[]> {
  const { sheets, sheetId } = getSheetsClient();

  // Lê A até Q (col L e M são puladas mas precisamos do range completo)
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "'PAUSA'!A2:Q50",
  });

  const rows = response.data.values ?? [];

  return rows
    .filter((row) => row[0])
    .map((row) => {
      const pausa10 = parseTimeHHMMSS(row[2]); // col C
      const pausa20 = parseTimeHHMMSS(row[3]); // col D

      return {
        email: String(row[0]).trim().toLowerCase(),
        tempoIndisponivel: parseTimeHHMMSS(row[1]), // col B
        pausa10,
        pausa20,
        pausaParticular: parseTimeHHMMSS(row[4]), // col E
        pausaMonitoramento: parseTimeHHMMSS(row[5]), // col F
        pausaTreinamento: parseTimeHHMMSS(row[6]), // col G
        pausaFeedback: parseTimeHHMMSS(row[7]), // col H
        pausaPrePausa: parseTimeHHMMSS(row[8]), // col I
        pausaAtivo: parseTimeHHMMSS(row[9]), // col J
        pausaTakeBlip: parseTimeHHMMSS(row[10]), // col K
        // row[11] = col L (PAUSA 15, ignorada)
        // row[12] = col M (PAUSA 40, ignorada)
        pausaOperacional: parseTimeHHMMSS(row[13]), // col N
        pausaEmail: parseTimeHHMMSS(row[14]), // col O
        pausaIndisponivel: parseTimeHHMMSS(row[15]), // col P
        pausaSistema: parseTimeHHMMSS(row[16]), // col Q
        nr17: sumTimes(pausa10, pausa20),
      };
    });
}
