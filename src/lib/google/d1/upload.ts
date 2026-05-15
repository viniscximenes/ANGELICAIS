import { getTimePartsInBR } from "@/lib/utils/format-datetime-br";

import { getSheetsClient } from "../sheets-client";

export type UploadProgress =
  | "validating"
  | "clearing"
  | "writing"
  | "stamping";

export type UploadResult =
  | { success: true; rowsWritten: number }
  | { success: false; error: string };

const BASE_SHEET = "BASE - 1";
const CONSOLIDADO_SHEET = "CONSOLIDADO";
const MAX_ROWS = 10000;
const EXPECTED_COLUMNS = 18; // A até R

/**
 * Recebe o CSV já parseado como matriz (linha 0 = cabeçalho).
 * Valida estrutura, limpa a BASE - 1, escreve, e grava hora em CONSOLIDADO!L2.
 */
export async function uploadBaseToSheet(
  parsedRows: string[][],
  onProgress?: (step: UploadProgress) => void,
): Promise<UploadResult> {
  try {
    onProgress?.("validating");

    // Validação 1 — tem ao menos cabeçalho + 1 linha
    if (parsedRows.length < 2) {
      return {
        success: false,
        error: "CSV vazio ou só com cabeçalho",
      };
    }

    // Validação 2 — número de colunas
    const cols = parsedRows[0].length;
    if (cols !== EXPECTED_COLUMNS) {
      return {
        success: false,
        error: `CSV tem ${cols} colunas, esperado ${EXPECTED_COLUMNS} (A até R)`,
      };
    }

    // Validação 3 — não excede limite
    const dataRows = parsedRows.slice(1); // remove cabeçalho
    if (dataRows.length > MAX_ROWS - 1) {
      return {
        success: false,
        error: `CSV tem ${dataRows.length} linhas, máximo ${MAX_ROWS - 1}`,
      };
    }

    const { sheets, sheetId } = getSheetsClient();

    // LIMPA a BASE - 1 (linhas 2 em diante, preserva cabeçalho)
    onProgress?.("clearing");

    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: `'${BASE_SHEET}'!A2:R${MAX_ROWS}`,
    });

    // ESCREVE os dados novos (a partir de A2)
    onProgress?.("writing");

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `'${BASE_SHEET}'!A2`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: dataRows },
    });

    // GRAVA a hora do report em CONSOLIDADO!L2
    onProgress?.("stamping");

    const { hour, minute } = getTimePartsInBR();
    const hora = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `'${CONSOLIDADO_SHEET}'!L2`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[hora]] },
    });

    return { success: true, rowsWritten: dataRows.length };
  } catch (err) {
    console.error("[upload] erro:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro desconhecido",
    };
  }
}
