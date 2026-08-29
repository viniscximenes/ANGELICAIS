/**
 * Seletor de período do relatório de performance por operador
 * (/operacao/analise-operadores).
 *
 * O range é calculado a partir do MÊS MAIS RECENTE disponível em
 * kpi_monthly_snapshots (não do mês calendário), para não sumir com o
 * relatório quando o fechamento do mês atrasa.
 */
export type Periodo = "3m" | "6m" | "12m" | "todos";

export const PERIODO_VALUES: Periodo[] = ["3m", "6m", "12m", "todos"];

export const PERIODO_LABELS: Record<Periodo, string> = {
  "3m": "3 meses",
  "6m": "6 meses",
  "12m": "12 meses",
  todos: "Tudo (12m)",
};

export const PERIODO_PADRAO: Periodo = "3m";

export function isPeriodo(value: string): value is Periodo {
  return (PERIODO_VALUES as string[]).includes(value);
}

/**
 * Quantidade de meses ANTERIORES ao mais recente (o mês mais recente é
 * sempre incluído). "todos" foi limitado aos últimos 12 meses (= "12m") —
 * evita a varredura de tabela inteira no cálculo de quartil a cada troca
 * de operador.
 */
const MESES_ANTERIORES: Record<Periodo, number> = {
  "3m": 2,
  "6m": 5,
  "12m": 11,
  todos: 11,
};

/**
 * `mes_ref` inicial (inclusive, formato `YYYY-MM-01`) do período, dado o mês
 * mais recente com dado. Nunca retorna null — todo período é limitado.
 */
export function resolveMesRefInicial(
  mesMaisRecente: string,
  periodo: Periodo,
): string {
  const [ano, mes] = mesMaisRecente.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1 - MESES_ANTERIORES[periodo], 1));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}
