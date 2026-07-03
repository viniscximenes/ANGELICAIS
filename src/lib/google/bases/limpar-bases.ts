import { getSheetsClient } from "../sheets-client";

const BASE_1_SHEET = "BASE - 1";
const BASE_1_MAX_ROWS = 10000; // igual a uploadBaseToSheet (d1/upload.ts)
const BASE_2_SHEET = "BASE - 2";
const BASE_2_MAX_ROWS = 50000; // igual a uploadBase2ToSheet (d1/tempo-logado/upload.ts)

export type LimparBasesResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Limpeza diária automática (cron, meia-noite BRT) da BASE - 1 e BASE - 2:
 * apaga os dados colados — mesmo range que o upload limpa antes de colar
 * (A:R na BASE - 1, A:K na BASE - 2) — e a hora/nome do último report (S2 e
 * L2, respectivamente).
 *
 * NÃO toca nas colunas de fórmula (S em diante na BASE - 1, M em diante na
 * BASE - 2) nem nas guias dos supervisores (ex.: "ANA ANGELICA") — elas
 * ficam vazias sozinhas porque suas fórmulas referenciam a BASE - 1/BASE - 2.
 */
export async function limparBases(): Promise<LimparBasesResult> {
  try {
    const { sheets, sheetId } = getSheetsClient();

    await sheets.spreadsheets.values.batchClear({
      spreadsheetId: sheetId,
      requestBody: {
        ranges: [
          `'${BASE_1_SHEET}'!A2:R${BASE_1_MAX_ROWS}`,
          `'${BASE_1_SHEET}'!S2`,
          `'${BASE_2_SHEET}'!A2:K${BASE_2_MAX_ROWS}`,
          `'${BASE_2_SHEET}'!L2`,
        ],
      },
    });

    return { success: true };
  } catch (err) {
    console.error("[limpar-bases] erro:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro desconhecido",
    };
  }
}
