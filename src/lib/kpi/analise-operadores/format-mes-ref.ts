const MESES_ABREV = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

/**
 * `2026-08-01` → `ago/26` (rótulo curto pro eixo X dos gráficos).
 *
 * NÃO passa por `Date`/`Intl` com timeZone: `new Date(Date.UTC(y, m, 1))`
 * formatado em America/Sao_Paulo (UTC-3) volta pro último dia do mês
 * ANTERIOR, deslocando todos os rótulos um mês pra trás (agosto virava
 * "jul/26" e parecia "sumido"). `mesRef` já é `YYYY-MM-01` — basta indexar.
 */
export function formatMesRefCurto(mesRef: string): string {
  const [ano, mes] = mesRef.split("-").map(Number);
  return `${MESES_ABREV[mes - 1] ?? mes}/${String(ano).slice(-2)}`;
}

/** `2026-08-01` → `08/2026` (rótulo do cabeçalho / metadados). */
export function formatMesRefLongo(mesRef: string): string {
  const [ano, mes] = mesRef.split("-");
  return `${mes}/${ano}`;
}

/** Intervalo legível: `03/2026 – 08/2026` ou `08/2026` se for um mês só. */
export function formatIntervaloMesRef(meses: string[]): string {
  if (meses.length === 0) return "—";
  const ordenados = [...meses].sort();
  const ini = formatMesRefLongo(ordenados[0]);
  const fim = formatMesRefLongo(ordenados[ordenados.length - 1]);
  return ini === fim ? ini : `${ini} – ${fim}`;
}
