import type { TmaStatus } from "./tma-status-pure";

/**
 * Formatação compartilhada do TMA — antes cada função existia em duas
 * cópias (get-gestor-tma-analitico.ts / get-rechamada-polo-tma.ts, e as
 * cores de status no gráfico e no modal). Módulo puro, sem I/O:
 * importável do servidor e do client. Ficar FORA dos dois get-* também
 * resolve o motivo original da cópia de horaCurta (import circular entre
 * eles).
 */

/** "HH:MM:SS" -> "HH:MM". Nulo: "—". Formato inesperado: devolve a string original. */
export function horaCurta(hora: string | null): string {
  if (!hora) return "—";
  const partes = hora.split(":");
  return partes.length >= 2 ? `${partes[0]}:${partes[1]}` : hora;
}

/** Cor (CSS) do status: verde dentro da meta, vermelho fora, neutro sem meta/sem dado. */
export function corStatusTma(status: TmaStatus): string {
  if (status === "danger") return "var(--danger)";
  if (status === "success") return "var(--success)";
  return "var(--foreground)";
}

/** Mesma regra de corStatusTma, como classe Tailwind de texto. */
export function classeStatusTma(status: TmaStatus): string {
  if (status === "danger") return "text-danger";
  if (status === "success") return "text-success";
  return "text-foreground";
}
