/**
 * Jornada diária padrão: 6h20m = 22800 segundos.
 */
export const JORNADA_SEGUNDOS = 6 * 3600 + 20 * 60;

/**
 * Formata segundos como HH:MM:SS.
 */
export function formatSecondsAsHHMMSS(seconds: number | null): string {
  if (seconds === null || seconds < 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Converte string HH:MM:SS para segundos.
 * Retorna null se inválido.
 */
export function parseHHMMSSToSeconds(str: string): number | null {
  const parts = str.trim().split(":");
  if (parts.length !== 3) return null;

  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const s = parseInt(parts[2], 10);

  if (isNaN(h) || isNaN(m) || isNaN(s)) return null;
  if (h < 0 || m < 0 || m > 59 || s < 0 || s > 59) return null;

  return h * 3600 + m * 60 + s;
}

/**
 * Calcula o delta entre a jornada padrão e o tempo logado real.
 * Retorna 0 se tempo_logado >= jornada (não há tempo a justificar).
 */
export function calcDeltaFromJornada(tempoLogadoSegundos: number): number {
  const delta = JORNADA_SEGUNDOS - tempoLogadoSegundos;
  return delta > 0 ? delta : 0;
}
