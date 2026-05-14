import { getSheetsClient } from "../../sheets-client";
import { parseHora } from "../parse";
import { parseTimeHHMMSS } from "../tempo-logado/parse";
import { parsePercent } from "./parse";
import type { OperadorIndisp } from "./types";

export async function fetchIndisp(): Promise<{
  operadores: OperadorIndisp[];
  horaReport: string;
}> {
  const { sheets, sheetId } = getSheetsClient();

  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: sheetId,
    ranges: [
      "'INDISP'!A2:C50",
      "'TEMPO LOGADO'!F2", // hora do report (compartilhada com tempo-logado)
    ],
  });

  const opsRange = response.data.valueRanges?.[0]?.values ?? [];
  const horaCell = response.data.valueRanges?.[1]?.values?.[0]?.[0];

  const operadores: OperadorIndisp[] = opsRange
    .filter((row) => row[0])
    .map((row) => ({
      email: String(row[0]).trim().toLowerCase(),
      indispPercent: parsePercent(row[1]),
      tempoLogado: parseTimeHHMMSS(row[2]),
    }));

  const horaReport = parseHora(horaCell);

  return { operadores, horaReport };
}
