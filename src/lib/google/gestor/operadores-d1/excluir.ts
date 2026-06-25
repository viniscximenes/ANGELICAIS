import { getSheetsClient } from "../../sheets-client";

export type ExcluirResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Localiza o operador nas DUAS guias e limpa A:B das linhas encontradas.
 * C+ (fórmulas) fica intacto — com A vazio, a fórmula retorna 0.
 *
 * O email pode estar em linhas diferentes em cada guia (caso de dessincronização);
 * ambas são buscadas independentemente. Se não encontrado em uma delas, avisa
 * no log mas continua limpando onde achou.
 */
export async function excluirOperadorD1(
  guiaPrincipal: string,
  guia2: string,
  email: string,
): Promise<ExcluirResult> {
  const emailNorm = email.trim().toLowerCase();
  const { sheets, sheetId } = getSheetsClient();

  // Localizar linha nas DUAS guias (1 batchGet)
  let readData;
  try {
    readData = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: sheetId,
      ranges: [
        `'${guiaPrincipal}'!A2:A100`,
        `'${guia2}'!A2:A100`,
      ],
    });
  } catch (err) {
    console.error("[excluirOperadorD1] erro ao ler guias:", err);
    return { ok: false, error: "Erro ao acessar a planilha. Tente novamente." };
  }

  const rows1 = readData.data.valueRanges?.[0]?.values ?? [];
  const rows2 = readData.data.valueRanges?.[1]?.values ?? [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function acharLinha(rows: any[][]): number | null {
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i]?.[0] ?? "").trim().toLowerCase() === emailNorm) {
        return i + 2;
      }
    }
    return null;
  }

  const linha1 = acharLinha(rows1);
  const linha2 = acharLinha(rows2);

  if (!linha1 && !linha2) {
    return { ok: false, error: "Operador não encontrado em nenhuma das guias." };
  }

  if (!linha1) {
    console.warn(
      `[excluirOperadorD1] "${emailNorm}" não encontrado na guia "${guiaPrincipal}" — limpando só "${guia2}"`,
    );
  }
  if (!linha2) {
    console.warn(
      `[excluirOperadorD1] "${emailNorm}" não encontrado na guia "${guia2}" — limpando só "${guiaPrincipal}"`,
    );
  }

  const rangesToClear: string[] = [];
  if (linha1) rangesToClear.push(`'${guiaPrincipal}'!A${linha1}:B${linha1}`);
  if (linha2) rangesToClear.push(`'${guia2}'!A${linha2}:B${linha2}`);

  // Limpar A:B nas linhas encontradas (1 batchClear)
  try {
    await sheets.spreadsheets.values.batchClear({
      spreadsheetId: sheetId,
      requestBody: { ranges: rangesToClear },
    });
  } catch (err) {
    console.error("[excluirOperadorD1] erro ao limpar:", err);
    return { ok: false, error: "Erro ao limpar na planilha. Tente novamente." };
  }

  return { ok: true };
}
