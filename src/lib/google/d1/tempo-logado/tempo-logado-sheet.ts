import { getSheetsClient } from "../../sheets-client";
import { parseHora } from "../parse";
import { decodeReportStamp } from "../report-stamp";
import { parseTimeHHMMSS } from "./parse";
import type { OperadorTempoLogado } from "./types";

const SUPERVISORES = [
  "ANA ANGELICA",
  "JULIANA FERREIRA",
  "JOAO VILELA",
  "GABRIEL XIMENES",
  "VITOR GOMES",
  "PATRICIA DALMASIO",
  "SAMIRA LEAO",
  "FERNANDA QUEIROZ",
];

export async function fetchTempoLogado(): Promise<{
  operadores: OperadorTempoLogado[];
  horaReport: string;
}> {
  const { sheets, sheetId } = getSheetsClient();

  const ranges = [
    "'BASE - 2'!L2", // hora do report
    ...SUPERVISORES.map((s) => `'${s}2'!A2:E100`), // operadores: A=email, C=tempo logado, D=tempo restante, E=logout estimado
  ];

  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: sheetId,
    ranges,
  });

  const valueRanges = response.data.valueRanges ?? [];
  const horaCell = valueRanges[0]?.values?.[0]?.[0];
  const horaReport = parseHora(decodeReportStamp(horaCell).hora);

  const operadores: OperadorTempoLogado[] = [];

  for (let i = 0; i < SUPERVISORES.length; i++) {
    const opsValues = valueRanges[1 + i]?.values ?? [];
    for (const row of opsValues) {
      const email = String(row[0] ?? "").trim().toLowerCase();
      if (!email || email.includes("@gestora") || email === "agente") continue;
      
      operadores.push({
        email,
        tempoLogado: parseTimeHHMMSS(row[2]),
        tempoRestante: parseTimeHHMMSS(row[3]),
        logoutEstimado: parseTimeHHMMSS(row[4]),
      });
    }
  }

  return { operadores, horaReport };
}
