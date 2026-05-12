import { getSheetsClient } from "../sheets-client";
import { pairContractsWithClients, parseContractsList } from "./parse";
import type { OperadorContratos } from "./types";

export async function fetchContratos(): Promise<OperadorContratos[]> {
  const { sheets, sheetId } = getSheetsClient();

  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: sheetId,
    ranges: ["CONTRATOS!A2:C50", "CONTRATOS!E2:G50"],
  });

  const cancelRange = response.data.valueRanges?.[0]?.values ?? [];
  const retRange = response.data.valueRanges?.[1]?.values ?? [];

  const map = new Map<string, OperadorContratos>();

  for (const row of cancelRange) {
    const email = String(row[0] ?? "").trim().toLowerCase();
    if (!email) continue;
    const contracts = parseContractsList(row[1]);
    const clients = parseContractsList(row[2]);
    const cancelados = pairContractsWithClients(contracts, clients);
    map.set(email, {
      email,
      cancelados,
      retidos: map.get(email)?.retidos ?? [],
    });
  }

  for (const row of retRange) {
    const email = String(row[0] ?? "").trim().toLowerCase();
    if (!email) continue;
    const contracts = parseContractsList(row[1]);
    const clients = parseContractsList(row[2]);
    const retidos = pairContractsWithClients(contracts, clients);
    const existing = map.get(email);
    map.set(email, {
      email,
      cancelados: existing?.cancelados ?? [],
      retidos,
    });
  }

  return Array.from(map.values());
}
