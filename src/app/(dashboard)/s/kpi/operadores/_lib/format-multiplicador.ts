/**
 * Formato do KPI "Multiplicador" (slug `multiplicador`, kpi_definitions,
 * value_type "number") — CONFIRMADO no banco (kpi_monthly_snapshots,
 * setembro/2026): valores pequenos, fracionários (1, 1.5, 3, 4, 5, ...) —
 * é um FATOR, não um percentual nem um valor monetário. Exibido como "4.0x"
 * (1 casa decimal + sufixo "x"), como pedido na spec.
 *
 * Não confundir com "Multiplicador (RV)" (_lib/celula-multiplicador-rv.ts) —
 * esse é o valor GANHO em R$ do indicador `multiplicador_retido` do RV,
 * KPI diferente, já formatado em reais.
 */
export function formatMultiplicador(valor: number | null): string {
  if (valor === null) return "—";
  return `${valor.toFixed(1)}x`;
}
