/**
 * Calcula TX bruta = retidos / (retidos + cancelados) × 100.
 * Retorna 0 se não há pedidos (evita divisão por zero).
 */
export function calcTxBruta(retidos: number, cancelados: number): number {
  const pedidos = retidos + cancelados;
  if (pedidos === 0) return 0;
  return (retidos / pedidos) * 100;
}
