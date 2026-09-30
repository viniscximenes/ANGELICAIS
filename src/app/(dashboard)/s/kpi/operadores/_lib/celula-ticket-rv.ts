import type { RvCalculation } from "@/lib/rv/calc-types";

import {
  formatReaisSemCentavosSeInteiro,
  STYLE_DANGER,
  STYLE_NEUTRO,
  STYLE_SUCESSO,
  type ResultadoIndicadorRv,
} from "./celula-indicador-rv";

/** "−9" (menos-unicode, igual ao exemplo do pedido) a partir de um threshold negativo (-9). */
function formatThresholdPct(threshold: number): string {
  return `−${Math.abs(threshold)}`;
}

/**
 * Célula "Ticket (RV)" — reaproveita `RvCalculation.tieredResults` (já
 * computado por calculateRv, lib/rv/*, não alterado: faixa por
 * variacao_ticket, direção closer_to_zero, e o pré-requisito
 * requires_indicator_slug/requires_threshold quando preenchido — se não
 * atendido, o motor já devolve faixaAtingida null, sem lógica extra aqui) —
 * não recalcula nada, só decide texto/cor/tooltip.
 *
 * Mesma família de estados das demais colunas de RV: inelegível/indisponível
 * → "–" + tooltip; sem dado (valorAtual null) → "–" sem tooltip; nenhuma
 * faixa atingida → "R$ 0 - NOK" + tooltip com a faixa mínima; faixa atingida
 * → "R$ <valor>" + tooltip com a faixa.
 */
export function celulaTicketRv(
  calculo: Pick<RvCalculation, "status" | "motivoNaoElegivel" | "motivoIndisponibilidade" | "tieredResults">,
  indicatorSlug: string,
): ResultadoIndicadorRv {
  if (calculo.status === "nao_elegivel") {
    const regra = calculo.motivoNaoElegivel?.replace(/^Não atendeu: /, "") ?? "elegibilidade";
    const titulo = `Inelegível: ${regra} não atendido`;
    return { texto: "–", style: STYLE_NEUTRO, title: titulo, ariaLabel: titulo };
  }

  if (calculo.status === "indisponivel_status") {
    const titulo = calculo.motivoIndisponibilidade?.mensagem ?? "Operador indisponível neste mês";
    return { texto: "–", style: STYLE_NEUTRO, title: titulo, ariaLabel: titulo };
  }

  const resultado = calculo.tieredResults.find((r) => r.indicator.slug === indicatorSlug);
  if (!resultado || resultado.valorAtual === null) {
    return { texto: "–", style: STYLE_NEUTRO };
  }

  if (resultado.faixaAtingida) {
    const titulo = `Faixa: até ${formatThresholdPct(resultado.faixaAtingida.threshold)}%`;
    return {
      texto: formatReaisSemCentavosSeInteiro(resultado.valorGanho),
      style: STYLE_SUCESSO,
      title: titulo,
      ariaLabel: titulo,
    };
  }

  // Nenhuma faixa atingida: "faixa mínima" = a de MENOR valor de pagamento
  // (a mais fácil de bater, entre as cadastradas) — é ela que falta pra
  // sair do "R$ 0 - NOK".
  const faixaMinima = resultado.indicator.faixas.reduce(
    (min, f) => (f.value < min.value ? f : min),
    resultado.indicator.faixas[0],
  );
  const titulo = faixaMinima ? `Mínimo: até ${formatThresholdPct(faixaMinima.threshold)}%` : undefined;

  return {
    texto: `${formatReaisSemCentavosSeInteiro(0)} - NOK`,
    style: STYLE_DANGER,
    title: titulo,
    ariaLabel: titulo,
  };
}
