import { getSheetsClient } from "../../sheets-client";

// Aceita nome.sobrenome@alloha.com (com pelo menos um ponto no local-part).
const EMAIL_REGEX = /^[a-z0-9][a-z0-9._-]*\.[a-z0-9][a-z0-9._-]*@alloha\.com$/i;

export type AdicionarResult =
  | { ok: true; linha: number }
  | { ok: false; error: string };

/**
 * Adiciona um operador nas DUAS guias do gestor.
 *
 * Fluxo:
 *  1. Valida o formato do email.
 *  2. batchGet A2:A100 nas duas guias → verifica duplicata E acha linha vazia.
 *     - "Linha vazia" = primeira linha >= 2 com A vazio em AMBAS (reusa buracos).
 *  3. batchGet C<linha> nas duas guias com FORMULA → salvaguarda do limite.
 *  4. batchUpdate A:B<linha> nas duas guias em uma única chamada.
 *
 * Usa 3 chamadas à API (2 leituras + 1 escrita).
 */
export async function adicionarOperadorD1(
  guiaPrincipal: string,
  guia2: string,
  email: string,
  nomeSupervisor: string,
): Promise<AdicionarResult> {
  const emailNorm = email.trim().toLowerCase();

  if (!EMAIL_REGEX.test(emailNorm)) {
    return {
      ok: false,
      error: "Email inválido. Use o formato nome.sobrenome@alloha.com",
    };
  }

  const { sheets, sheetId } = getSheetsClient();

  // ── Passo 1: verificar duplicatas + achar linha vazia (1 batchGet) ──────────
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
    console.error("[adicionarOperadorD1] erro ao ler guias:", err);
    return { ok: false, error: "Erro ao acessar a planilha. Tente novamente." };
  }

  const rows1 = readData.data.valueRanges?.[0]?.values ?? [];
  const rows2 = readData.data.valueRanges?.[1]?.values ?? [];

  // Duplicata em qualquer das duas guias
  const jaExiste = [...rows1, ...rows2].some(
    (r) => String(r?.[0] ?? "").trim().toLowerCase() === emailNorm,
  );
  if (jaExiste) {
    return { ok: false, error: "Operador já está na equipe." };
  }

  // Primeira linha >= 2 vazia em AMBAS simultaneamente (reusa buracos de exclusão).
  // Linhas além do comprimento da resposta são implicitamente vazias.
  let linhaDestino = 0;
  for (let linha = 2; linha <= 100; linha++) {
    const i = linha - 2;
    const a1 = String(rows1[i]?.[0] ?? "").trim();
    const a2 = String(rows2[i]?.[0] ?? "").trim();
    if (!a1 && !a2) {
      linhaDestino = linha;
      break;
    }
  }

  if (linhaDestino === 0) {
    return {
      ok: false,
      error: "Nenhuma linha disponível no intervalo monitorado (linhas 2–100).",
    };
  }

  // ── Passo 2: verificar que C<linha> tem fórmula em AMBAS (salvaguarda) ──────
  let formulaData;
  try {
    formulaData = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: sheetId,
      ranges: [
        `'${guiaPrincipal}'!C${linhaDestino}`,
        `'${guia2}'!C${linhaDestino}`,
      ],
      valueRenderOption: "FORMULA",
    });
  } catch (err) {
    console.error("[adicionarOperadorD1] erro ao verificar fórmula:", err);
    return {
      ok: false,
      error: "Erro ao verificar limite da planilha. Tente novamente.",
    };
  }

  const formula1 = String(
    formulaData.data.valueRanges?.[0]?.values?.[0]?.[0] ?? "",
  ).trim();
  const formula2 = String(
    formulaData.data.valueRanges?.[1]?.values?.[0]?.[0] ?? "",
  ).trim();

  if (!formula1 || !formula2) {
    const semFormula = !formula1 ? guiaPrincipal : guia2;
    return {
      ok: false,
      error: `Limite de operadores atingido na guia "${semFormula}" — contate o administrador para estender as fórmulas.`,
    };
  }

  // ── Passo 3: escrever nas DUAS guias em uma única batchUpdate ───────────────
  try {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        valueInputOption: "RAW",
        data: [
          {
            range: `'${guiaPrincipal}'!A${linhaDestino}:B${linhaDestino}`,
            values: [[emailNorm, nomeSupervisor]],
          },
          {
            range: `'${guia2}'!A${linhaDestino}:B${linhaDestino}`,
            values: [[emailNorm, nomeSupervisor]],
          },
        ],
      },
    });
  } catch (err) {
    console.error("[adicionarOperadorD1] erro ao escrever:", err);
    return { ok: false, error: "Erro ao salvar na planilha. Tente novamente." };
  }

  return { ok: true, linha: linhaDestino };
}
