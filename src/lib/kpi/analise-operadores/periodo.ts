/**
 * Seletor de período do relatório de performance por operador
 * (/operacao/analise-operadores).
 *
 * A janela tem SEMPRE N meses (3/6/12). O toggle "Incluir mês atual"
 * desliza o FIM da janela — não corta um mês de uma janela fixa:
 *  - LIGADO   → fim = mês mais recente disponível.
 *  - DESLIGADO → fim = mês anterior ao atual (a janela inteira desliza).
 */
export type Periodo = "3m" | "6m" | "12m";

export const PERIODO_VALUES: Periodo[] = ["3m", "6m", "12m"];

export const PERIODO_LABELS: Record<Periodo, string> = {
  "3m": "3 meses",
  "6m": "6 meses",
  "12m": "12 meses",
};

export const PERIODO_PADRAO: Periodo = "3m";

/** Nº de meses da janela para cada período. */
export const MESES_JANELA: Record<Periodo, number> = {
  "3m": 3,
  "6m": 6,
  "12m": 12,
};

export function isPeriodo(value: string): value is Periodo {
  return (PERIODO_VALUES as string[]).includes(value);
}

/** `YYYY-MM-01` `n` meses antes de `mesRef` (n negativo = depois). */
export function subtrairMeses(mesRef: string, n: number): string {
  const [ano, mes] = mesRef.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1 - n, 1));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export type Janela = {
  /** Primeiro mês da janela (YYYY-MM-01, inclusive). */
  inicio: string;
  /** Último mês da janela (YYYY-MM-01, inclusive). */
  fim: string;
  /** Sequência completa de N meses (YYYY-MM-01), do mais antigo ao mais recente. */
  meses: string[];
};

/**
 * Janela de N meses. O toggle `incluirMesAtual` decide onde a janela
 * TERMINA (mês atual ou o anterior), nunca remove um mês de dentro dela —
 * então o nº de meses exibidos é sempre N nos dois estados.
 *
 * Só desliza pra trás quando o mês mais recente COM DADO é de fato o mês
 * calendário corrente (o "ainda não fechado"); se o fechamento está
 * atrasado, não há mês atual a excluir e o toggle não muda nada.
 */
export function resolveJanela(params: {
  mesMaisRecenteDisponivel: string;
  periodo: Periodo;
  incluirMesAtual: boolean;
  mesAtualRef: string;
}): Janela {
  const { mesMaisRecenteDisponivel, periodo, incluirMesAtual, mesAtualRef } =
    params;
  const n = MESES_JANELA[periodo];

  const fim =
    !incluirMesAtual && mesMaisRecenteDisponivel === mesAtualRef
      ? subtrairMeses(mesMaisRecenteDisponivel, 1)
      : mesMaisRecenteDisponivel;

  const meses: string[] = [];
  for (let i = n - 1; i >= 0; i--) meses.push(subtrairMeses(fim, i));

  return { inicio: meses[0], fim, meses };
}
