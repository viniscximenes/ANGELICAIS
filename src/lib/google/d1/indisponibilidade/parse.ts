/**
 * Normaliza valor de % vindo do Sheets. Valor já vem em escala 0-100.
 * Aceita:
 * - Número direto (ex: 86, 12.3, 0.86) → retorna como está
 * - String "12.3%" → 12.3
 * - String "12,3%" → 12.3 (vírgula brasileira)
 * - Strings vazias ou inválidas → null
 */
export function parsePercent(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const cleaned = value.trim().replace(",", ".").replace("%", "");
    if (/^#[A-Z/!?]+$/i.test(cleaned)) return null;
    const num = parseFloat(cleaned);
    if (isNaN(num)) return null;
    return num;
  }

  return null;
}

/**
 * Soma dois valores HH:MM:SS e retorna HH:MM:SS.
 */
export function sumTimes(timeA: string, timeB: string): string {
  function toSec(t: string): number {
    const match = t.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
    if (!match) return 0;
    const [, h, m, s] = match;
    return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s);
  }

  const total = toSec(timeA) + toSec(timeB);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
