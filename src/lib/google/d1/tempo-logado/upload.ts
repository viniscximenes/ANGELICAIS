import { getSheetsClient } from "../../sheets-client";

export type UploadProgress =
  | "validating"
  | "backup"
  | "clearing"
  | "writing"
  | "stamping";

export type UploadResult =
  | { success: true; rowsWritten: number }
  | { success: false; error: string };

const BASE_SHEET = "BASE - 2";
const BACKUP_SHEET = "BASE - 2 (backup)";
const TEMPO_LOGADO_SHEET = "TEMPO LOGADO";
const MAX_ROWS = 50000;
const EXPECTED_COLUMNS = 11; // A até K

/**
 * Recebe o CSV já parseado como matriz (linha 0 = cabeçalho).
 * Valida estrutura, cria backup, limpa, escreve, e grava hora em
 * TEMPO LOGADO!F2.
 */
export async function uploadBase2ToSheet(
  parsedRows: string[][],
  onProgress?: (step: UploadProgress) => void,
): Promise<UploadResult> {
  try {
    onProgress?.("validating");

    if (parsedRows.length < 2) {
      return { success: false, error: "CSV vazio ou só com cabeçalho" };
    }

    const cols = parsedRows[0].length;
    if (cols !== EXPECTED_COLUMNS) {
      return {
        success: false,
        error: `CSV tem ${cols} colunas, esperado ${EXPECTED_COLUMNS} (A até K)`,
      };
    }

    const dataRows = parsedRows.slice(1);
    if (dataRows.length > MAX_ROWS - 1) {
      return {
        success: false,
        error: `CSV tem ${dataRows.length} linhas, máximo ${MAX_ROWS - 1}`,
      };
    }

    const { sheets, sheetId } = getSheetsClient();

    // BACKUP
    onProgress?.("backup");

    const currentData = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `'${BASE_SHEET}'!A1:K${MAX_ROWS}`,
    });

    const valuesToBackup = currentData.data.values ?? [];

    const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const backupExists = meta.data.sheets?.some(
      (s) => s.properties?.title === BACKUP_SHEET,
    );

    if (!backupExists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [
            {
              addSheet: { properties: { title: BACKUP_SHEET } },
            },
          ],
        },
      });
    } else {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: sheetId,
        range: `'${BACKUP_SHEET}'!A1:K${MAX_ROWS}`,
      });
    }

    if (valuesToBackup.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `'${BACKUP_SHEET}'!A1`,
        valueInputOption: "RAW",
        requestBody: { values: valuesToBackup },
      });
    }

    // LIMPA (preserva cabeçalho linha 1)
    onProgress?.("clearing");

    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: `'${BASE_SHEET}'!A2:K${MAX_ROWS}`,
    });

    // ESCREVE
    onProgress?.("writing");

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `'${BASE_SHEET}'!A2`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: dataRows },
    });

    // STAMP HORA em TEMPO LOGADO!F2
    onProgress?.("stamping");

    const now = new Date();
    const hora = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `'${TEMPO_LOGADO_SHEET}'!F2`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[hora]] },
    });

    return { success: true, rowsWritten: dataRows.length };
  } catch (err) {
    console.error("[upload-base-2] erro:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro desconhecido",
    };
  }
}
