import type { KpiDefinition } from "../types";

/**
 * Formata valor conforme tipo:
 * - percent: "62.5%"
 * - percent_negative: "-3.2%" / "+0.0%" (sempre com sinal)
 * - number: inteiro sem decimais; senão 1 casa
 * - time: segundos →
 *     • < 1h  → "MM:SS"    (ex.: TMA, sempre < 25min — como sempre foi)
 *     • ≥ 1h  → "HHH:MM"   (acumulados mensais como tempo_login/tempo_projetado
 *                           chegam a ~100h; 3 dígitos de hora, SEM wrap em 24h)
 */
export function formatKpiValue(
  valor: number | null,
  valueType: KpiDefinition["valueType"],
): string {
  if (valor === null) return "—";

  switch (valueType) {
    case "percent":
      return `${valor.toFixed(1)}%`;

    case "percent_negative": {
      const abs = Math.abs(valor).toFixed(1);
      return valor < 0 ? `-${abs}%` : `+${abs}%`;
    }

    case "number":
      return Number.isInteger(valor) ? String(valor) : valor.toFixed(1);

    case "time": {
      const total = Math.max(0, Math.round(valor));
      const h = Math.floor(total / 3600);
      const m = Math.floor((total % 3600) / 60);
      const s = total % 60;
      // ≥ 1h: horas acumuladas do mês (tempo_login/tempo_projetado vão a
      // ~100h) — HHH:MM, 3 dígitos de hora, sem relógio de 24h / wraparound.
      if (h >= 1) {
        return `${String(h).padStart(3, "0")}:${String(m).padStart(2, "0")}`;
      }
      // < 1h: MM:SS (TMA e afins).
      return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }

    default:
      return String(valor);
  }
}
