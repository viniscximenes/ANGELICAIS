const TIMEZONE = "America/Sao_Paulo";

/** `2026-08-01` → `ago/26` (rótulo curto pro eixo X dos gráficos). */
export function formatMesRefCurto(mesRef: string): string {
  const [ano, mes] = mesRef.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, 1));
  const nome = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIMEZONE,
    month: "short",
  })
    .format(d)
    .replace(".", "");
  return `${nome}/${String(ano).slice(-2)}`;
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
