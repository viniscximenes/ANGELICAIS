export type TmaStatus = "success" | "danger" | "neutral";

export type TmaThresholdConfig = {
  /** Threshold efetivo em segundos (override do gestor, senão o default do KPI). null se nenhum dos dois existir. */
  threshold: number | null;
  direction: "lower_better" | "higher_better";
};

/** "MM:SS" -> segundos. Formato inválido/nulo -> null. */
export function metaMmSsParaSegundos(meta: unknown): number | null {
  if (typeof meta !== "string") return null;
  const m = meta.trim().match(/^(\d{1,3}):(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

/** Status semântico de um valor (segundos) contra o threshold efetivo — mesma comparação em toda a TMA (tabela principal e Analítico). */
export function statusTmaDe(valor: number | null, config: TmaThresholdConfig): TmaStatus {
  if (valor === null || config.threshold === null) return "neutral";
  if (config.direction === "higher_better") return valor >= config.threshold ? "success" : "danger";
  return valor <= config.threshold ? "success" : "danger";
}
