import { getSheetsClient } from "../../sheets-client";
import { parseLoginLogoutTime } from "./parse";
import type { OperadorLoginLogout } from "./types";

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

export async function fetchLoginLogout(): Promise<OperadorLoginLogout[]> {
  const { sheets, sheetId } = getSheetsClient();

  const ranges = SUPERVISORES.map((s) => `'${s}2'!A2:G100`);

  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: sheetId,
    ranges,
  });

  const valueRanges = response.data.valueRanges ?? [];
  const loginLogout: OperadorLoginLogout[] = [];

  for (let i = 0; i < SUPERVISORES.length; i++) {
    const opsValues = valueRanges[i]?.values ?? [];
    for (const row of opsValues) {
      const email = String(row[0] ?? "").trim().toLowerCase();
      if (!email || email.includes("@gestora") || email === "agente") continue;
      
      loginLogout.push({
        email,
        horaLogin: parseLoginLogoutTime(row[5]), // login real (coluna F)
        horaLogout: parseLoginLogoutTime(row[6]), // logout (coluna G)
        logoutStatus: "sem_login" as const,
      });
    }
  }

  return loginLogout;
}
