import type { CSSProperties } from "react";

import { formatDuracaoHoras } from "./format-duracao-horas";

export interface CelulaTempoRestante {
  texto: string;
  style: CSSProperties;
  title?: string;
  ariaLabel?: string;
}

// Mesma cor das outras colunas neutras — não usa muted-foreground.
const STYLE_NEUTRO: CSSProperties = { color: "var(--foreground)" };
const STYLE_SUCESSO: CSSProperties = { color: "var(--success)" };

/**
 * Diferença em MINUTOS entre tempo_projetado e tempo_login, cada um truncado
 * (floor) pra minutos ANTES de subtrair — bate exatamente com a subtração
 * dos valores já truncados exibidos nas colunas Tempo Projetado/Tempo de
 * Login (ex.: 107:40 − 107:01 = 00:39). null se faltar algum dos dois.
 */
function diffEmMinutos(tempoProjetado: number | null, tempoLogin: number | null): number | null {
  if (tempoProjetado === null || tempoLogin === null) return null;
  return Math.floor(tempoProjetado / 60) - Math.floor(tempoLogin / 60);
}

/**
 * "Tempo Restante" — virtual, só nesta página (como Retidos Brutos):
 * tempo_projetado − tempo_login, em MINUTOS truncados (ver diffEmMinutos).
 *  > 0: "h:mm" em cor neutra (var(--foreground), igual às demais colunas).
 *  ≤ 0: "00:00" em var(--success), tooltip "Projetado cumprido (+h:mm)"
 *       (o "+h:mm" é o quanto o login ULTRAPASSOU o projetado, valor
 *       absoluto da diferença negativa).
 *  Falta algum dos dois: "–".
 */
export function celulaTempoRestante(
  tempoProjetado: number | null,
  tempoLogin: number | null,
): CelulaTempoRestante {
  const diffMin = diffEmMinutos(tempoProjetado, tempoLogin);
  if (diffMin === null) {
    return { texto: "–", style: STYLE_NEUTRO };
  }

  if (diffMin > 0) {
    return { texto: formatDuracaoHoras(diffMin * 60), style: STYLE_NEUTRO };
  }

  const excedente = formatDuracaoHoras(Math.abs(diffMin) * 60);
  const titulo = `Projetado cumprido (+${excedente})`;
  return { texto: "00:00", style: STYLE_SUCESSO, title: titulo, ariaLabel: titulo };
}

/** Valor em MINUTOS pra ordenação (mesmo sinal de "quanto falta"). null se faltar algum dos dois. */
export function valorTempoRestanteParaSort(
  tempoProjetado: number | null,
  tempoLogin: number | null,
): number | null {
  return diffEmMinutos(tempoProjetado, tempoLogin);
}
