import { getSheetsClient } from "../sheets-client";
import { parseHora, parseNumber, parsePercent } from "./parse";
import type { OperadorConsolidado, ResumoEquipe } from "./types";

export async function fetchConsolidado(): Promise<{
  operadores: OperadorConsolidado[];
  equipe: ResumoEquipe;
}> {
  const { sheets, sheetId } = getSheetsClient();

  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: sheetId,
    ranges: ["CONSOLIDADO!A2:E50", "CONSOLIDADO!G2:L2"],
  });

  const opsRange = response.data.valueRanges?.[0]?.values ?? [];
  const equipeRange = response.data.valueRanges?.[1]?.values?.[0] ?? [];

  const operadores: OperadorConsolidado[] = opsRange
    .filter((row) => row[0])
    .map((row) => ({
      email: String(row[0]).trim().toLowerCase(),
      retidos: parseNumber(row[1]),
      cancelados: parseNumber(row[2]),
      pedidos: parseNumber(row[3]),
      txRetencao: parsePercent(row[4]),
    }));

  // Mapeamento G..L → índices 0..5. K (índice 4) fica vazio, L (índice 5) = hora
  const equipe: ResumoEquipe = {
    retidos: parseNumber(equipeRange[0]),
    cancelados: parseNumber(equipeRange[1]),
    pedidos: parseNumber(equipeRange[2]),
    txRetencao: parsePercent(equipeRange[3]),
    horaReport: parseHora(equipeRange[5]),
  };

  return { operadores, equipe };
}
