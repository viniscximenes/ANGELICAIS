import type { RvCalculation } from "@/lib/rv/calc-types";

import {
  formatReaisSemCentavosSeInteiro,
  STYLE_DANGER,
  STYLE_NEUTRO,
  STYLE_SUCESSO,
  type ResultadoIndicadorRv,
} from "./celula-indicador-rv";

// Rótulos curtos pro tooltip "Não atingido: ..." — não vêm de nenhuma coluna
// do banco (rv_combined_bonus.conditions só tem o kpiSlug técnico), então é
// mapeamento de APRESENTAÇÃO, não um valor de regra/threshold. Os 3 KPIs
// "normais" de hoje batem com os nomes já usados nas outras colunas da
// tabela; os slugs de deflator conhecidos vêm de rv_deflator_types.slug
// (conferido no banco) — qualquer slug novo, de KPI ou deflator, cai no
// fallback (capitaliza/troca "_" por espaço) em vez de quebrar.
const LABELS_KPI_CURTOS: Record<string, string> = {
  tx_retencao_bruta: "Retenção",
  tma: "TMA",
  indisp_total: "Indisp",
};

const LABELS_DEFLATOR_CONHECIDOS: Record<string, string> = {
  advertencia: "Advertência",
  suspensao: "Suspensão",
  tma_fora_da_meta: "TMA fora da meta",
  pausas_fora_da_meta: "Pausas fora da meta",
  erro_de_procedimento: "Erro de procedimento",
  nao_escalonar_oferta: "Não escalonar oferta",
};

function labelCurtoCondicao(kpiSlug: string): string {
  if (LABELS_KPI_CURTOS[kpiSlug]) return LABELS_KPI_CURTOS[kpiSlug];
  if (kpiSlug.startsWith("deflator:")) {
    const nome = kpiSlug.slice("deflator:".length);
    if (LABELS_DEFLATOR_CONHECIDOS[nome]) return LABELS_DEFLATOR_CONHECIDOS[nome];
    return nome.charAt(0).toUpperCase() + nome.slice(1).replace(/_/g, " ");
  }
  return kpiSlug;
}

/**
 * Célula "Bônus" — reaproveita `RvCalculation.combinedBonusResults`, já
 * computado por getRvParaEquipe/calculateRv (lib/rv/*, não alterado,
 * inclusive a resolução de `deflator:*` contra rv_deflator_applications e de
 * `thresholdKpiSlug`) — não recalcula nada, só decide texto/cor/tooltip.
 *
 * Mesma família de estados de celulaIndicadorRv (_lib/celula-indicador-rv.ts):
 * inelegível/indisponível → "–" + tooltip; sem valor de algum KPI da
 * condição → "–" sem tooltip; elegível com alguma condição não atingida →
 * "R$ 0 - NOK" + tooltip listando só as que faltaram; todas atingidas →
 * "R$ <value_if_all_achieved>".
 */
export function celulaBonusRv(
  calculo: Pick<RvCalculation, "status" | "motivoNaoElegivel" | "motivoIndisponibilidade" | "combinedBonusResults">,
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

  // Só existe 1 bônus combinado no rule_set de hoje ("Bônus de Desempenho"),
  // mas pega pelo índice 0 em vez de fixar o nome — se um segundo bônus
  // combinado for cadastrado no futuro, esta coluna simplesmente continua
  // refletindo o primeiro, sem quebrar.
  const bonus = calculo.combinedBonusResults[0];
  if (!bonus) {
    return { texto: "–", style: STYLE_NEUTRO };
  }

  // "Sem algum dos KPIs necessários" — checado ANTES de "não atingiu": uma
  // condição sem dado (valorAtual null) já vira atingiu=false no motor
  // (compareValues(null,...) = false), mas aqui isso deve virar "–" (sem
  // dado), não "R$ 0 - NOK" (avaliado e reprovado).
  const faltaAlgumValor = bonus.conditionResults.some((c) => c.valorAtual === null);
  if (faltaAlgumValor) {
    return { texto: "–", style: STYLE_NEUTRO };
  }

  if (bonus.todasAtingidas) {
    return { texto: formatReaisSemCentavosSeInteiro(bonus.valorGanho), style: STYLE_SUCESSO };
  }

  const naoAtingidas = bonus.conditionResults
    .filter((c) => !c.atingiu)
    .map((c) => labelCurtoCondicao(c.kpiSlug));
  const titulo = `Não atingido: ${naoAtingidas.join(", ")}`;

  return {
    texto: `${formatReaisSemCentavosSeInteiro(bonus.valorGanho)} - NOK`,
    style: STYLE_DANGER,
    title: titulo,
    ariaLabel: titulo,
  };
}
