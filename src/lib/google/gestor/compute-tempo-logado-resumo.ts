import type { GestorTempoLogadoLinha, TempoLogadoResumo } from "./tempo-logado-types";

export function computeTempoLogadoResumo(
  operadores: GestorTempoLogadoLinha[],
): TempoLogadoResumo {
  const total = operadores.length;
  const cumpriramMeta = operadores.filter(
    (op) => op.status === "completo" && op.cumpriuMeta,
  ).length;
  const abaixoDaMeta = operadores.filter(
    (op) => op.status === "completo" && !op.cumpriuMeta,
  ).length;
  const aindaLogados = operadores.filter(
    (op) => op.status === "ainda_logado",
  ).length;
  const ausentes = operadores.filter((op) => op.status === "ausente").length;

  const comTempo = operadores.filter((op) => op.tempoLogadoSegundos > 0);
  const tempoMedioSegundos =
    comTempo.length > 0
      ? Math.round(
          comTempo.reduce((s, op) => s + op.tempoLogadoSegundos, 0) /
            comTempo.length,
        )
      : 0;

  return { total, cumpriramMeta, abaixoDaMeta, aindaLogados, ausentes, tempoMedioSegundos };
}
