import type { KpiSerie } from "./serial-types";

/**
 * Tendência de uma série no período: compara o PRIMEIRO com o ÚLTIMO ponto
 * não-afastado (valorPlot), com faixa morta de 2% pra não classificar ruído
 * como movimento.
 */
export type Tendencia = "subindo" | "caindo" | "estavel";

export function calcularTendencia(
  pontos: { valorPlot: number | null }[],
): Tendencia {
  const vals = pontos
    .map((p) => p.valorPlot)
    .filter((v): v is number => v !== null);
  if (vals.length < 2) return "estavel";

  const primeiro = vals[0];
  const ultimo = vals[vals.length - 1];
  const delta = ultimo - primeiro;
  const base = Math.max(Math.abs(primeiro), Math.abs(ultimo), 1e-9);

  if (Math.abs(delta) / base < 0.02) return "estavel";
  return delta > 0 ? "subindo" : "caindo";
}

/** Seta do movimento bruto do valor (independe de ser bom ou ruim). */
export function setaTendencia(t: Tendencia): string {
  if (t === "subindo") return "↑";
  if (t === "caindo") return "↓";
  return "→";
}

export type Favorabilidade = "favoravel" | "desfavoravel" | "neutro";

/**
 * A tendência é BOA ou RUIM pro KPI, conforme `direction`:
 * higher_better → subir é favorável; lower_better → cair é favorável;
 * closer_to_zero → aproximar-se de zero (|último| < |primeiro|) é favorável.
 */
export function favorabilidadeTendencia(
  pontos: { valorPlot: number | null }[],
  direction: KpiSerie["direction"],
  t: Tendencia,
): Favorabilidade {
  if (t === "estavel") return "neutro";

  if (direction === "higher_better") {
    return t === "subindo" ? "favoravel" : "desfavoravel";
  }
  if (direction === "lower_better") {
    return t === "caindo" ? "favoravel" : "desfavoravel";
  }
  if (direction === "closer_to_zero") {
    const vals = pontos
      .map((p) => p.valorPlot)
      .filter((v): v is number => v !== null);
    if (vals.length < 2) return "neutro";
    return Math.abs(vals[vals.length - 1]) < Math.abs(vals[0])
      ? "favoravel"
      : "desfavoravel";
  }
  return "neutro";
}

export function rotuloTendencia(f: Favorabilidade): string {
  if (f === "favoravel") return "Melhorando";
  if (f === "desfavoravel") return "Piorando";
  return "Estável";
}
