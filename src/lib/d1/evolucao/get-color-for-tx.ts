import type { TxZone } from "./types";

/**
 * 3 zonas:
 * - tx < 60% → danger (vermelho)
 * - 60% <= tx < 66% → warning (amarelo)
 * - tx >= 66% → success (verde)
 */
export function getColorForTx(tx: number): TxZone {
  if (tx < 60) return "danger";
  if (tx < 66) return "warning";
  return "success";
}

export function getColorCssVar(tx: number): string {
  const zone = getColorForTx(tx);
  return `var(--${zone})`;
}
