import type { KpiSerie } from "./serial-types";

/**
 * Tendência de desempenho no período.
 *
 * A SETA reflete se o DESEMPENHO melhorou ou piorou (conforme `direction`
 * do KPI), NUNCA o sinal bruto do número:
 *  - ↑ verde  = desempenho melhorou (higher_better: valor subiu;
 *               lower_better: valor caiu; closer_to_zero: |valor| diminuiu)
 *  - ↓ vermelho = desempenho piorou
 *  - –  cinza  = estável (variação relativa < 2% entre o 1º e o último
 *               ponto não-afastado — evita classificar ruído)
 */
type MovimentoBruto = "subiu" | "caiu" | "estavel";

const LIMIAR_RELATIVO = 0.02; // 2% — vale bem p/ percent, time (seg) e number

function movimentoBruto(pontos: { valorPlot: number | null }[]): {
  mov: MovimentoBruto;
  primeiro: number | null;
  ultimo: number | null;
} {
  const vals = pontos
    .map((p) => p.valorPlot)
    .filter((v): v is number => v !== null);
  if (vals.length < 2) return { mov: "estavel", primeiro: null, ultimo: null };

  const primeiro = vals[0];
  const ultimo = vals[vals.length - 1];
  const delta = ultimo - primeiro;
  const base = Math.max(Math.abs(primeiro), Math.abs(ultimo), 1e-9);

  if (Math.abs(delta) / base < LIMIAR_RELATIVO) {
    return { mov: "estavel", primeiro, ultimo };
  }
  return { mov: delta > 0 ? "subiu" : "caiu", primeiro, ultimo };
}

export type TendenciaResolvida = {
  seta: "↑" | "↓" | "–";
  /** classe CSS do template: .trend.good / .bad / .flat */
  cls: "good" | "bad" | "flat";
  rotulo: "Melhorando" | "Piorando" | "Estável";
};

const ESTAVEL: TendenciaResolvida = {
  seta: "–",
  cls: "flat",
  rotulo: "Estável",
};
const MELHOROU: TendenciaResolvida = {
  seta: "↑",
  cls: "good",
  rotulo: "Melhorando",
};
const PIOROU: TendenciaResolvida = {
  seta: "↓",
  cls: "bad",
  rotulo: "Piorando",
};

export function resolverTendencia(
  pontos: { valorPlot: number | null }[],
  direction: KpiSerie["direction"],
): TendenciaResolvida {
  const { mov, primeiro, ultimo } = movimentoBruto(pontos);
  if (mov === "estavel") return ESTAVEL;

  if (direction === "higher_better") {
    return mov === "subiu" ? MELHOROU : PIOROU;
  }
  if (direction === "lower_better") {
    return mov === "caiu" ? MELHOROU : PIOROU;
  }
  if (direction === "closer_to_zero" && primeiro !== null && ultimo !== null) {
    return Math.abs(ultimo) < Math.abs(primeiro) ? MELHOROU : PIOROU;
  }
  return ESTAVEL;
}
