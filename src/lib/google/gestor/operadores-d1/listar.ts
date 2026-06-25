import { getSheetsClient } from "../../sheets-client";

export type OperadorD1 = {
  email: string;
  linha: number; // 1-based (número real da linha na planilha, >= 2)
};

/**
 * Lê a coluna A da guia principal e retorna a lista de operadores com a linha
 * de cada um. Linhas vazias (buracos de exclusão) são ignoradas.
 *
 * Mapeamento de linha: A2 = índice 0 → linha 2; A3 = índice 1 → linha 3; etc.
 * O Sheets API inclui linhas vazias intermediárias como [] na resposta, então
 * o mapeamento índice → linha é sempre i + 2 (sem deslocamento por buracos).
 */
export async function listarOperadoresD1(
  guiaPrincipal: string,
): Promise<OperadorD1[]> {
  const { sheets, sheetId } = getSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `'${guiaPrincipal}'!A2:A100`,
  });

  const rows = response.data.values ?? [];
  const operadores: OperadorD1[] = [];

  for (let i = 0; i < rows.length; i++) {
    const email = String(rows[i]?.[0] ?? "").trim().toLowerCase();
    if (email) {
      operadores.push({ email, linha: i + 2 });
    }
  }

  return operadores;
}
