/**
 * Formatador LOCAL de duração em horas — usado SÓ pelas 3 colunas de horas
 * desta rota (TEMPO PROJETADO, TEMPO DE LOGIN, TEMPO RESTANTE). NÃO é o
 * formatador de TMA (mm:ss / hhh:mm, compartilhado em
 * lib/kpi/atual/format-kpi-value.ts) — esse continua intocado.
 *
 * Entrada: segundos (negativos são tratados como 0). Saída: sempre "H:MM",
 * com horas em NO MÍNIMO 2 dígitos e SEM limite superior de dígitos
 * (0 → "00:00", 39min → "00:39", 5h24 → "05:24", 82h20 → "82:20",
 * 107h40 → "107:40"). Minutos sempre 2 dígitos. Segundos são truncados
 * (floor) pra minutos — nunca exibidos.
 */
export function formatDuracaoHoras(segundos: number): string {
  const totalMinutos = Math.floor(Math.max(0, segundos) / 60);
  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;
  return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
}
