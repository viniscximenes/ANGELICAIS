import type { KpiDefinition } from "../types";

/**
 * Formata valor conforme tipo:
 * - percent: "62.5%"
 * - percent_negative: "-3.2%" / "+0.0%" (sempre com sinal)
 * - number: inteiro sem decimais; senão 1 casa
 * - time: segundos → "HH:MM:SS"
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
      const total = Math.round(valor);
      const h = Math.floor(total / 3600);
      const m = Math.floor((total % 3600) / 60);
      const s = total % 60;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }

    default:
      return String(valor);
  }
}
