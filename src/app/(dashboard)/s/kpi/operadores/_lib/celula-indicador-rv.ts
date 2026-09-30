import type { CSSProperties } from "react";

import type { RvCalculation } from "@/lib/rv/calc-types";

export interface ResultadoIndicadorRv {
  texto: string;
  style: CSSProperties;
  /** Tooltip nativo (title) — motivo quando "R$ 0 - NOK" (inelegível ou meta não atingida). */
  title?: string;
  ariaLabel?: string;
}

// Exportados pra _lib/celula-bonus-rv.ts reaproveitar (mesmas cores/formato
// de reais das colunas de indicador binário — sem duplicar).
export const STYLE_NEUTRO: CSSProperties = { color: "var(--muted-foreground)" };
export const STYLE_SUCESSO: CSSProperties = { color: "var(--success)" };
export const STYLE_DANGER: CSSProperties = {
  color: "var(--danger)",
  backgroundColor: "color-mix(in srgb, var(--danger) 8%, transparent)",
};

/** "R$ 100" (sem centavos, valor inteiro) / "R$ 33,50" (com centavos, se algum dia não for inteiro). */
export function formatReaisSemCentavosSeInteiro(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: Number.isInteger(valor) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

/**
 * Célula genérica de indicador binário de RV (op_pausas → "Indisp (RV)",
 * op_tma → "TMA (RV)", e qualquer outro que a rota adicionar no futuro) —
 * reaproveita o `RvCalculation` já computado por getRvParaEquipe/calculateRv
 * (lib/rv/*, não alterado), não recalcula nada.
 *
 * Regra (pedido explícito desta rodada — muda de novo em relação à anterior):
 * - Sem valor do KPI-base (indisp_total/tma null): "–", SEM tooltip.
 * - Inelegível (rv_eligibility_rules): "–" também, mas COM tooltip
 *   explicando o motivo — visualmente igual ao "sem dado", mas com contexto
 *   acessível via title/aria-label.
 * - Elegível e não atingiu a meta do indicador: "R$ 0 - NOK", com tooltip
 *   "Meta: <display_name do indicador>".
 * - Atingiu: "R$ <value_if_achieved>".
 * - Status indisponível (afastado/licença/desligado) tratado igual a
 *   inelegível (mesma família "não avaliado" — "–" + tooltip com o motivo),
 *   não explicitado no pedido mas consistente com a mesma lógica.
 */
export function celulaIndicadorRv(params: {
  /** Valor do KPI-base (indisp_total, tma, ...) pro operador — vem de op.kpis, não do cálculo de RV. null = "–". */
  valorKpi: number | null;
  /** .normal ou .contestacao, já escolhido pelo caller conforme rvModo. */
  calculo: Pick<RvCalculation, "status" | "motivoNaoElegivel" | "motivoIndisponibilidade" | "binaryResults">;
  /** slug do indicador em rv_binary_indicators (ex.: "op_pausas", "op_tma"). */
  indicatorSlug: string;
}): ResultadoIndicadorRv {
  const { valorKpi, calculo, indicatorSlug } = params;

  if (valorKpi === null) {
    return { texto: "–", style: STYLE_NEUTRO };
  }

  if (calculo.status === "nao_elegivel") {
    // motivoNaoElegivel já vem como "Não atendeu: <display_name da regra>"
    // (calculate-rv.ts, lido do banco via rv_eligibility_rules — não fixamos
    // valor nenhum aqui, só reformatamos o texto já pronto).
    const regra = calculo.motivoNaoElegivel?.replace(/^Não atendeu: /, "") ?? "elegibilidade";
    const titulo = `Inelegível: ${regra} não atendido`;
    return { texto: "–", style: STYLE_NEUTRO, title: titulo, ariaLabel: titulo };
  }

  if (calculo.status === "indisponivel_status") {
    const titulo = calculo.motivoIndisponibilidade?.mensagem ?? "Operador indisponível neste mês";
    return { texto: "–", style: STYLE_NEUTRO, title: titulo, ariaLabel: titulo };
  }

  const resultado = calculo.binaryResults.find((r) => r.indicator.slug === indicatorSlug);
  if (!resultado) {
    // Defensivo: status "ok" mas o indicador não está no rule_set do scope
    // atual (não deveria acontecer enquanto op_pausas/op_tma existirem em
    // rv_binary_indicators pro scope "current").
    return { texto: "–", style: STYLE_NEUTRO };
  }

  if (resultado.atingiu) {
    return { texto: formatReaisSemCentavosSeInteiro(resultado.valorGanho), style: STYLE_SUCESSO };
  }

  const titulo = `Meta: ${resultado.indicator.displayName}`;
  return {
    texto: `${formatReaisSemCentavosSeInteiro(resultado.valorGanho)} - NOK`,
    style: STYLE_DANGER,
    title: titulo,
    ariaLabel: titulo,
  };
}
