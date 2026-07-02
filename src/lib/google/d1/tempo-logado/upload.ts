import { getTimePartsInBR } from "@/lib/utils/format-datetime-br";

import { getSheetsClient } from "../../sheets-client";

export type UploadProgress =
  | "validating"
  | "clearing"
  | "writing"
  | "stamping";

export type UploadResult =
  | { success: true; rowsWritten: number }
  | { success: false; error: string };

const BASE_SHEET = "BASE - 2";
const MAX_ROWS = 50000;
const EXPECTED_COLUMNS = 11; // A até K

/**
 * Recebe o CSV já parseado como matriz (linha 0 = cabeçalho).
 * Valida estrutura, limpa a BASE - 2, escreve, e grava hora + nome do
 * supervisor em BASE - 2!L2:M2.
 */
export async function uploadBase2ToSheet(
  parsedRows: string[][],
  supervisorNome: string,
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

    // GRAVA a hora do report (L2) e o nome de quem fez o upload (M2).
    onProgress?.("stamping");

    const { hour, minute } = getTimePartsInBR();
    const hora = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: [
          { range: `'${BASE_SHEET}'!L2`, values: [[hora]] },
          { range: `'${BASE_SHEET}'!M2`, values: [[supervisorNome]] },
        ],
      },
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
