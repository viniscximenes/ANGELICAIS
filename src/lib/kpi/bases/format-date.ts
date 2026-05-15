import {
  formatDateBR as _formatDateBR,
  formatDateTimeBR as _formatDateTimeBR,
  getDatePartsInBR,
} from "@/lib/utils/format-datetime-br";

/**
 * Primeiro dia do mês atual no fuso de Brasília, formato "YYYY-MM-01".
 */
export function getCurrentMonthRef(): string {
  const { year, month } = getDatePartsInBR();
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

/**
 * Data de ontem no fuso de Brasília, formato "YYYY-MM-DD".
 * Se hoje é dia 1, retorna o último dia do mês passado.
 */
export function getYesterday(): string {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const { year, month, day } = getDatePartsInBR(yesterday);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Data de hoje no fuso de Brasília, formato "YYYY-MM-DD".
 */
export function getToday(): string {
  const { year, month, day } = getDatePartsInBR();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
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

export const formatDateBR = _formatDateBR;
export const formatDateTimeBR = _formatDateTimeBR;

/**
 * "YYYY-MM" ou "YYYY-MM-DD" → "YYYY-MM-01".
 */
export function toMonthRef(yearMonth: string): string {
  const match = yearMonth.match(/^(\d{4})-(\d{2})/);
  if (!match) return "";
  return `${match[1]}-${match[2]}-01`;
}

/**
 * Último dia do mês informado no formato "YYYY-MM-DD".
 * Aceita "YYYY-MM-01" como entrada.
 */
export function getLastDayOfMonth(mesRef: string): string {
  const [year, month] = mesRef.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}
