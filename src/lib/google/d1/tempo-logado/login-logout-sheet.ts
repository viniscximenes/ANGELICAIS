import { getSheetsClient } from "../../sheets-client";
import { parseLoginLogoutTime } from "./parse";
import type { OperadorLoginLogout } from "./types";

export async function fetchLoginLogout(): Promise<OperadorLoginLogout[]> {
  const { sheets, sheetId } = getSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "'LOGIN E LOGOUT'!A2:C50",
  });

  const rows = response.data.values ?? [];

  return rows
    .filter((row) => row[0])
    .map((row) => ({
      email: String(row[0]).trim().toLowerCase(),
      horaLogin: parseLoginLogoutTime(row[1]),
      horaLogout: parseLoginLogoutTime(row[2]),
      logoutStatus: "sem_login" as const, // preenchido em getTempoLogadoData
    }));
}
