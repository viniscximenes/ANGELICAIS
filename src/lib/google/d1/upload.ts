import { getTimePartsInBR } from "@/lib/utils/format-datetime-br";

import { getSheetsClient } from "../sheets-client";
import { decodeReportStamp, encodeReportStamp } from "./report-stamp";

export type UploadProgress =
  | "validating"
  | "clearing"
  | "writing"
  | "stamping";

export type UploadResult =
  | { success: true; rowsWritten: number }
  | { success: false; error: string };

const BASE_SHEET = "BASE - 1";
const MAX_ROWS = 10000;
const EXPECTED_COLUMNS = 18; // A até R

/**
 * Lê a hora e o nome do supervisor do último report da BASE - 1, gravados
 * juntos em S2 (ver report-stamp.ts — a guia não tem coluna livre depois de
 * S). Usada pela regra dos 5 min e para exibir "quem fez o report" no painel.
 * Campos retornam null se a célula estiver vazia.
 */
export async function fetchUltimoReportInfo(): Promise<{
  hora: string | null;
  nomeSupervisor: string | null;
}> {
  const { sheets, sheetId } = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `'${BASE_SHEET}'!S2`,
  });
  const { hora: horaRaw, nomeSupervisor } = decodeReportStamp(
    res.data.values?.[0]?.[0],
  );
  const hora = String(horaRaw ?? "").trim();
  return {
    hora: hora || null,
    nomeSupervisor,
  };
}

/**
 * Recebe o CSV já parseado como matriz (linha 0 = cabeçalho).
 * Valida estrutura, limpa a BASE - 1, escreve, e grava a hora do report em
 * BASE - 1!S2 (e mantém CONSOLIDADO!L2 para o D-1 da empresa).
 */
export async function uploadBaseToSheet(
  parsedRows: string[][],
  supervisorNome: string,
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
    // Trava cada linha em EXPECTED_COLUMNS (A:R). Mesmo que uma linha do CSV
    // venha com colunas extras, a escrita nunca passa de R — protege as
    // fórmulas fixas da coluna S em diante.
    const dataRows = parsedRows
      .slice(1) // remove cabeçalho
      .map((row) => row.slice(0, EXPECTED_COLUMNS));
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

    // GRAVA a hora do report (HH:MM) e o nome de quem fez o upload, juntos
    // em S2 ("HH:MM|NOME" — ver report-stamp.ts). Fonte usada pelas guias de
    // leitura (ex.: painel do gestor) e pela regra dos 5 min. Fica FORA da
    // faixa A:R, então nem o clear nem a colagem do CSV a tocam.
    // A guia BASE - 1 tem só 19 colunas (até S); gravar o nome à parte em T
    // (coluna 20) estoura o limite da grade ("exceeds grid limits").
    onProgress?.("stamping");

    const { hour, minute } = getTimePartsInBR();
    const hora = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `'${BASE_SHEET}'!S2`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[encodeReportStamp(hora, supervisorNome)]] },
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
