/**
 * Normaliza cabeçalho para comparação tolerante.
 * "Tx. Retenção\nBruta (%)" → "tx. retenção bruta (%)"
 */
export function normalizeHeader(text: string): string {
  return text
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[“”]/g, '"')
    .trim()
    .toLowerCase();
}
