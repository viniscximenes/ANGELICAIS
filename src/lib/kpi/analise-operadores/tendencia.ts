/**
 * Tendência de uma série no período: compara o PRIMEIRO com o ÚLTIMO ponto
 * não-afastado (valorPlot), com uma faixa morta de 2% pra não classificar
 * ruído como movimento.
 *
 * (Alternativa mais suave, se quiser depois: sinal do coeficiente angular
 * de uma regressão linear sobre todos os pontos não-afastados.)
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

export function rotuloTendencia(t: Tendencia): string {
  if (t === "subindo") return "Subindo";
  if (t === "caindo") return "Caindo";
  return "Estável";
}
