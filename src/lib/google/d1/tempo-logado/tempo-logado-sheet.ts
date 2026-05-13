import { getSheetsClient } from "../../sheets-client";
import { parseHora } from "../parse";
import { parseTimeHHMMSS } from "./parse";
import type { OperadorTempoLogado } from "./types";

export async function fetchTempoLogado(): Promise<{
  operadores: OperadorTempoLogado[];
  horaReport: string;
}> {
  const { sheets, sheetId } = getSheetsClient();

  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: sheetId,
    ranges: [
      "'TEMPO LOGADO'!A2:D50", // operadores: A=email, B=logado, C=restante, D=logout estimado
      "'TEMPO LOGADO'!F2", // hora do report
    ],
  });

  const opsRange = response.data.valueRanges?.[0]?.values ?? [];
  const horaCell = response.data.valueRanges?.[1]?.values?.[0]?.[0];

  const operadores: OperadorTempoLogado[] = opsRange
    .filter((row) => row[0])
    .map((row) => ({
      email: String(row[0]).trim().toLowerCase(),
      tempoLogado: parseTimeHHMMSS(row[1]),
      tempoRestante: parseTimeHHMMSS(row[2]),
      logoutEstimado: parseTimeHHMMSS(row[3]),
    }));

  const horaReport = parseHora(horaCell);

  return { operadores, horaReport };
}
