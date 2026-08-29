const TIMEZONE = "America/Sao_Paulo";

/**
 * Formata como "DD/MM/YYYY às HH:MM" no fuso de Brasília.
 */
export function formatDateTimeBR(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;

  const dateStr = date.toLocaleDateString("pt-BR", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const timeStr = date.toLocaleTimeString("pt-BR", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `${dateStr} às ${timeStr}`;
}

/**
 * "DD/MM/YYYY" em Brasília. Aceita Date ou string ISO/`YYYY-MM-DD`.
 */
export function formatDateBR(input: string | Date): string {
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    // Date-only strings: evita o shift de UTC ao construir Date()
    const [y, m, d] = input.split("-");
    return `${d}/${m}/${y}`;
  }
  const date = typeof input === "string" ? new Date(input) : input;
  return date.toLocaleDateString("pt-BR", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Componentes (year/month/day) da data atual em Brasília.
 */
export function getDatePartsInBR(input: Date = new Date()): {
  year: number;
  month: number;
  day: number;
} {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(input);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return {
    year: parseInt(map.year),
    month: parseInt(map.month),
    day: parseInt(map.day),
  };
}
