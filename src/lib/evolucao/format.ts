import type { EvolucaoIndicador } from "./types";

const MESES_CURTOS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

/**
 * "2026-06-01" → "Jun/26".
 */
export function formatMesCurto(mesRef: string): string {
  const [year, month] = mesRef.split("-");
  const idx = parseInt(month, 10) - 1;
  const nome = MESES_CURTOS[idx] ?? month;
  return `${nome}/${year.slice(2)}`;
}

/**
 * Formata o valor de um indicador, PT-BR (vírgula decimal):
 * - tx_retencao / indisponibilidade / abs → "63,4%"
 * - tma → tempo "HH:MM:SS" (mesma convenção de formatKpiValue, em segundos)
 * - pedidos → inteiro
 */
export function formatValorIndicador(
  indicador: EvolucaoIndicador,
  valor: number | null,
): string {
  if (valor === null) return "—";

  if (indicador === "tma") {
    const total = Math.round(valor);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  if (indicador === "pedidos") {
    return String(Math.round(valor));
  }

  // percentuais: tx_retencao, indisponibilidade, abs
  return `${valor.toFixed(1).replace(".", ",")}%`;
}
