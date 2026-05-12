import { getSheetsClient } from "../sheets-client";
import { parseNumber } from "./parse";
import type { MotivosBreakdown, OperadorMotivos } from "./types";

function emptyBreakdown(): MotivosBreakdown {
  return {
    financeiro: 0,
    mudancaEndereco: 0,
    insatisfacaoServico: 0,
    insatisfacaoAtendimento: 0,
    mudancaProvedora: 0,
    outros: 0,
  };
}

function rowToBreakdown(row: unknown[]): MotivosBreakdown {
  return {
    financeiro: parseNumber(row[1]),
    mudancaEndereco: parseNumber(row[2]),
    insatisfacaoServico: parseNumber(row[3]),
    insatisfacaoAtendimento: parseNumber(row[4]),
    mudancaProvedora: parseNumber(row[5]),
    outros: parseNumber(row[6]),
  };
}

export async function fetchMotivos(): Promise<OperadorMotivos[]> {
  const { sheets, sheetId } = getSheetsClient();

  // CANCELADOS: A=operador, B=fin, C=end, D=ins_serv, E=ins_atend, F=mud_prov, G=outros
  // RETIDOS  : I=operador, J=fin, K=end, L=ins_serv, M=ins_atend, N=mud_prov, O=outros
  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: sheetId,
    ranges: ["MOTIVO!A2:G50", "MOTIVO!I2:O50"],
  });

  const cancelRange = response.data.valueRanges?.[0]?.values ?? [];
  const retRange = response.data.valueRanges?.[1]?.values ?? [];

  const map = new Map<string, OperadorMotivos>();

  for (const row of cancelRange) {
    const email = String(row[0] ?? "").trim().toLowerCase();
    if (!email) continue;
    map.set(email, {
      email,
      cancelados: rowToBreakdown(row),
      retidos: map.get(email)?.retidos ?? emptyBreakdown(),
    });
  }

  for (const row of retRange) {
    const email = String(row[0] ?? "").trim().toLowerCase();
    if (!email) continue;
    const existing = map.get(email);
    map.set(email, {
      email,
      cancelados: existing?.cancelados ?? emptyBreakdown(),
      retidos: rowToBreakdown(row),
    });
  }

  return Array.from(map.values());
}
