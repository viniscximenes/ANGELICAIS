import type { ContratoItem } from "./types";

function isSheetError(str: string): boolean {
  return str.startsWith("#") && (str.endsWith("!") || str === "#N/A");
}

export function parseNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value === null || value === undefined || value === "") return 0;
  const str = String(value).trim();
  if (isSheetError(str)) return 0;
  const normalized = str.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

export function parsePercent(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const str = String(value).trim();
  if (isSheetError(str)) return null;
  if (str.endsWith("%")) {
    const n = parseFloat(str.slice(0, -1).replace(",", "."));
    return Number.isFinite(n) ? n / 100 : null;
  }
  const n = parseFloat(str.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function parseContractsList(value: unknown): string[] {
  if (value === null || value === undefined) return [];
  const str = String(value).trim();
  if (!str) return [];

  // Detectar erros do Sheets (#N/A, #DIV/0!, #REF!, #VALUE!, #NAME?, #NUM!, #NULL!)
  if (/^#[A-Z/!?]+$/i.test(str)) return [];

  return str
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function pairContractsWithClients(
  contracts: string[],
  clients: string[],
): ContratoItem[] {
  const len = Math.min(contracts.length, clients.length);
  return contracts.slice(0, len).map((contrato, i) => ({
    contrato,
    cliente: clients[i]?.trim() || "—",
  }));
}

/**
 * Converte um valor de hora do Sheets para o formato "HH:MM".
 *
 * Aceita:
 * - string "14:30" ou "14:30:00"
 * - número serial do Sheets (fração do dia, ex: 0.604166 → "14:30")
 * - instância de Date
 *
 * Retorna "—" se o valor for null, undefined ou não-parseável.
 */
export function parseHora(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";

  if (value instanceof Date) {
    const h = String(value.getHours()).padStart(2, "0");
    const m = String(value.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const totalMinutes = Math.round(value * 24 * 60);
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = ((totalMinutes % 60) + 60) % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  const str = String(value).trim();
  if (str.includes(":")) {
    const [rawH, rawM] = str.split(":");
    const h = Number(rawH);
    const m = Number(rawM);
    if (Number.isFinite(h) && Number.isFinite(m)) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
  }

  return "—";
}
