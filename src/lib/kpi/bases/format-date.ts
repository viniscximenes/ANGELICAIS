/**
 * Primeiro dia do mês atual no formato "YYYY-MM-01".
 */
export function getCurrentMonthRef(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * Data de ontem no formato "YYYY-MM-DD". Se hoje é dia 1, retorna o
 * último dia do mês passado.
 */
export function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Data de hoje no formato "YYYY-MM-DD".
 */
export function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * "2026-05-01" → "Maio / 2026".
 */
export function formatMonthLabel(mesRef: string): string {
  const [year, month] = mesRef.split("-");
  const meses = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  return `${meses[parseInt(month) - 1]} / ${year}`;
}

/**
 * "2026-05-13" → "13/05/2026".
 */
export function formatDateBR(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

/**
 * ISO datetime → "13/05/2026 às 15:30".
 */
export function formatDateTimeBR(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mn = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yy} às ${hh}:${mn}`;
}
