import type { RvCalculation } from "@/lib/rv/calc-types";

import {
  formatReaisSemCentavosSeInteiro,
  STYLE_DANGER,
  STYLE_NEUTRO,
  type ResultadoIndicadorRv,
} from "./celula-indicador-rv";

const STYLE_VALOR: { color: string } = { color: "var(--foreground)" };

/** "R$ 4,00" — sempre com centavos (valor por retido, usado só no tooltip). */
function formatReaisComCentavos(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

/** "67.9" — 1 casa, ponto (não vírgula) — mesmo formato do exemplo do pedido ("retenção 67.9%"). */
function formatPercentPonto(valor: number): string {
  return valor.toFixed(1);
}

/**
 * Célula "Multiplicador (RV)" — reaproveita `RvCalculation.perUnitResults`
 * (já computado por calculateRv, lib/rv/*, não alterado: faixa por
 * tx_retencao_bruta, contagem de retidos via count_source, valorPorRetido ×
 * contagemRetidos) — não recalcula nada, só decide texto/cor/tooltip.
 *
 * Mesma família de estados das demais colunas de RV: inelegível/indisponível
 * → "–" + tooltip; sem dado (txAtual null) → "–" sem tooltip; valorGanho 0
 * (0 retidos no mês, ou faixa 0) → "R$ 0 - NOK"; caso contrário → "R$ <valor>"
 * com tooltip "R$ <por retido> × <n> retidos (retenção <tx>%)".
 */
export function celulaMultiplicadorRv(
  calculo: Pick<RvCalculation, "status" | "motivoNaoElegivel" | "motivoIndisponibilidade" | "perUnitResults">,
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

  const resultado = calculo.perUnitResults.find((r) => r.indicator.slug === indicatorSlug);
  if (!resultado || resultado.txAtual === null) {
    return { texto: "–", style: STYLE_NEUTRO };
  }

  if (resultado.valorGanho === 0) {
    return { texto: `${formatReaisSemCentavosSeInteiro(0)} - NOK`, style: STYLE_DANGER };
  }

  const titulo = `${formatReaisComCentavos(resultado.valorPorRetido)} × ${resultado.contagemRetidos} retidos (retenção ${formatPercentPonto(resultado.txAtual)}%)`;
  return {
    texto: formatReaisSemCentavosSeInteiro(resultado.valorGanho),
    style: STYLE_VALOR,
    title: titulo,
    ariaLabel: titulo,
  };
}
