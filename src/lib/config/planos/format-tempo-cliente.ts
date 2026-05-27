/**
 * Converte (tempo_min, tempo_max) numa string amigável.
 *
 * Exemplos:
 *   (0, 2)    → "< 3 meses"
 *   (3, 5)    → "3 a 5 meses"
 *   (6, 6)    → "6 meses"
 *   (6, null) → "≥ 6 meses"
 *   (7, null) → "≥ 7 meses"
 */
export function formatTempoCliente(min: number, max: number | null): string {
  if (max === null) {
    return `≥ ${min} ${min === 1 ? "mês" : "meses"}`;
  }

  if (min === max) {
    return `${min} ${min === 1 ? "mês" : "meses"}`;
  }

  if (min === 0) {
    return `< ${max + 1} meses`;
  }

  return `${min} a ${max} meses`;
}
