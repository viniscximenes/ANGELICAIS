import type { CSSProperties } from "react";

import type { RvCalculation } from "@/lib/rv/calc-types";

import { formatReaisSemCentavosSeInteiro, STYLE_DANGER, STYLE_NEUTRO } from "./celula-indicador-rv";

// Sem negrito/cor própria — mesmo estilo (fonte, peso, tamanho, cor) das
// demais colunas numéricas neutras (Ticket (RV)/Multiplicador (RV) quando
// não são sucesso/erro): sem override de cor nem peso, herda o padrão da
// célula (var(--foreground), peso normal). Cor só entra no sufixo de
// desconto, via STYLE_SUFIXO_DESCONTO abaixo.
const STYLE_VALOR_TOTAL: CSSProperties = {};

export const STYLE_SUFIXO_DESCONTO: CSSProperties = { color: "var(--danger)" };

/** "-15" → "15" (sem sinal, o sinal já vem no texto ao redor: "(-15%)"). */
function formatPct(pct: number): string {
  return Number.isInteger(pct) ? String(pct) : pct.toFixed(1);
}

export interface ResultadoRvTotal {
  texto: string;
  style: CSSProperties;
  title?: string;
  ariaLabel?: string;
  /** Trecho "(-15%)" à parte, pra colorir só ele em --danger dentro da mesma célula (texto principal fica --foreground). */
  sufixoDesconto?: string;
}

/**
 * Célula "RV (Total)" — reaproveita `RvCalculation.liquido` (já com
 * multiplicador de pedidos e deflatores aplicados — calculateRv, lib/rv/*,
 * não alterado) como o valor final exibido; não recalcula nada.
 *
 * IMPORTANTE (divergência documentada no relatório): o cálculo oficial
 * (`calculateRv`) expõe `tetoBase`/`tetoPossivel`, mas NÃO os usa pra capar
 * `liquido` — são informativos (tetoPossivel soma bônus "ainda possíveis",
 * usado só internamente). Não existe hoje nenhum ponto no app que aplique
 * teto como corte real do valor pago. Por isso esta célula NUNCA imprime
 * "Teto aplicado: ..." (só apareceria se o motor oficial de fato capasse o
 * valor) — implementar esse corte aqui seria inventar uma regra de negócio
 * que o cálculo oficial não tem, o que contraria o princípio de só
 * reaproveitar/ler do banco.
 */
export function celulaRvTotal(
  calculo: Pick<
    RvCalculation,
    "status" | "motivoNaoElegivel" | "motivoIndisponibilidade" | "subtotal" | "somaDescontosPct" | "liquido" | "deflatorResults"
  >,
): ResultadoRvTotal {
  if (calculo.status === "nao_elegivel") {
    // Exceção pedida: só nesta coluna o inelegível não vira "–", vira "ABS - NOK".
    const regra = calculo.motivoNaoElegivel?.replace(/^Não atendeu: /, "") ?? "elegibilidade";
    const titulo = `Inelegível: ${regra} não atendido`;
    return { texto: "ABS - NOK", style: STYLE_DANGER, title: titulo, ariaLabel: titulo };
  }

  if (calculo.status === "indisponivel_status") {
    const titulo = calculo.motivoIndisponibilidade?.mensagem ?? "Operador indisponível neste mês";
    return { texto: "–", style: STYLE_NEUTRO, title: titulo, ariaLabel: titulo };
  }

  if (calculo.status === "sem_dados") {
    return { texto: "–", style: STYLE_NEUTRO };
  }

  const descontosAtivos = calculo.deflatorResults.filter((d) => d.ocorrencias > 0);
  const bruto = formatReaisSemCentavosSeInteiro(calculo.subtotal);
  const final = formatReaisSemCentavosSeInteiro(calculo.liquido);
  const titulo =
    descontosAtivos.length > 0
      ? `Bruto: ${bruto} · Descontos: ${descontosAtivos
          .map((d) => `${d.deflatorType.displayName} (−${formatPct(d.percentTotal)}%)`)
          .join(", ")} · Final: ${final}`
      : `Bruto: ${bruto} · Final: ${final}`;

  if (calculo.somaDescontosPct > 0) {
    return {
      texto: final,
      style: STYLE_VALOR_TOTAL,
      title: titulo,
      ariaLabel: titulo,
      sufixoDesconto: `(-${formatPct(calculo.somaDescontosPct)}%)`,
    };
  }

  return { texto: final, style: STYLE_VALOR_TOTAL, title: titulo, ariaLabel: titulo };
}
