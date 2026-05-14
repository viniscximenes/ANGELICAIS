import type { ParsedClipboard } from "./types";

/**
 * Parser tolerante a quebras de linha dentro de células com aspas.
 * Funciona com TSV (Excel) e CSV.
 */
export function parseClipboard(text: string): ParsedClipboard | null {
  if (!text || !text.trim()) return null;

  // Detecta separador examinando primeira linha "lógica" (até primeiro \n fora de aspas)
  let firstLogicalLine = "";
  let inQuotesProbe = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') inQuotesProbe = !inQuotesProbe;
    if ((ch === "\n" || ch === "\r") && !inQuotesProbe) break;
    firstLogicalLine += ch;
  }

  const tabCount = (firstLogicalLine.match(/\t/g) || []).length;
  const commaCount = (firstLogicalLine.match(/,/g) || []).length;
  const separator = tabCount >= commaCount && tabCount > 0 ? "\t" : ",";

  // State machine: processa char por char respeitando aspas
  const allRows: string[][] = [];
  let currentRow: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === separator && !inQuotes) {
      currentRow.push(current.trim());
      current = "";
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i++;
      currentRow.push(current.trim());
      if (currentRow.some((c) => c !== "")) {
        allRows.push(currentRow);
      }
      currentRow = [];
      current = "";
    } else {
      current += ch;
    }
  }

  if (current !== "" || currentRow.length > 0) {
    currentRow.push(current.trim());
    if (currentRow.some((c) => c !== "")) {
      allRows.push(currentRow);
    }
  }

  if (allRows.length < 2) return null;

  const headers = allRows[0];
  const rows = allRows.slice(1).map((cells) => ({ cells }));

  // Substitui quebras de linha internas nos headers (Excel as preserva)
  const cleanHeaders = headers.map((h) =>
    h.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim(),
  );

  return {
    headers: cleanHeaders,
    rows,
    separator: separator === "\t" ? "TAB" : "VIRGULA",
    rawFirstLineSample: firstLogicalLine.slice(0, 300),
  };
}
