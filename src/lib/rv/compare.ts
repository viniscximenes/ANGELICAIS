import type { Comparison } from "./types";

/**
 * Aplica uma comparação. Retorna false se valor for null.
 */
export function compareValues(
  valor: number | null,
  op: Comparison,
  threshold: number,
): boolean {
  if (valor === null) return false;

  switch (op) {
    case "gte":
      return valor >= threshold;
    case "lte":
      return valor <= threshold;
    case "eq":
      return valor === threshold;
    case "gt":
      return valor > threshold;
    case "lt":
      return valor < threshold;
    default:
      return false;
  }
}

/**
 * Condição estourada de forma IRREVERSÍVEL (assumindo KPI acumulado
 * que não decresce no mês corrente):
 * - lte/lt: já passou do teto, não há como descer
 * - eq: já está diferente
 * - gte/gt: sempre dá pra subir → false
 */
export function isCondicaoEstouradaIrreversivel(
  valor: number | null,
  op: Comparison,
  threshold: number,
): boolean {
  if (valor === null) return false;

  switch (op) {
    case "lte":
      return valor > threshold;
    case "lt":
      return valor >= threshold;
    case "eq":
      return valor !== threshold;
    case "gte":
      return false;
    case "gt":
      return false;
    default:
      return false;
  }
}
