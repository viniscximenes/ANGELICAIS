import type { KpiValueType } from "@/lib/kpi/types";

/**
 * Ordem e rótulo FIXOS das colunas de /operacao/kpi-detalhado.
 *
 * Esta tela é um espelho 1:1 da planilha colada em /bases/kpi — cada coluna
 * é "título + valor bruto do slug", sem cálculo/regra de negócio. NÃO deriva
 * de kpi_definitions (nem de PRINCIPAL/SECUNDARIO_SLUGS_ORDER): é uma lista
 * própria desta página. /kpi/operadores e /kpi/gestor seguem com as listas
 * de 23 colunas de sempre, intocadas.
 *
 * `valueType` aqui é só para formatação (percent/number/time). Slugs sem
 * linha em kpi_definitions (novos ou metadata: forecast_*, meta_*) aparecem
 * vazios (N/D) até a planilha ser recolada com o parser já reconhecendo o
 * header — comportamento esperado, não é bug.
 */
export type ColunaKpiDetalhado = {
  slug: string;
  label: string;
  valueType: KpiValueType;
};

export const COLUNAS_KPI_DETALHADO: ColunaKpiDetalhado[] = [
  { slug: "pedidos", label: "Pedidos", valueType: "number" },
  { slug: "forecast_pedidos", label: "Forecast Pedidos Mês", valueType: "number" },
  { slug: "delta_pedido", label: "Δ Pedido", valueType: "number" },
  { slug: "delta_pedido_pct", label: "Δ Pedido (%)", valueType: "percent" },
  { slug: "churn", label: "Churn", valueType: "number" },
  { slug: "forecast_churn_dia", label: "Forecast Churn Dia", valueType: "number" },
  { slug: "forecast_churn", label: "Forecast Churn Mês", valueType: "number" },
  { slug: "delta_churn", label: "Δ Churn", valueType: "number" },
  { slug: "delta_churn_pct", label: "Δ Churn (%)", valueType: "percent" },
  { slug: "variacao_ticket", label: "% Variação Ticket", valueType: "percent_negative" },
  { slug: "media_descontos_pct", label: "% Média Descontos", valueType: "percent" },
  { slug: "retidos_brutos", label: "Retidos Brutos", valueType: "number" },
  { slug: "retidos_liquidos_7d", label: "Retidos Líquidos 7d", valueType: "number" },
  { slug: "retidos_liquidos_15d", label: "Retidos Líquidos 15d", valueType: "number" },
  { slug: "tx_retencao_bruta", label: "Tx. Retenção Bruta (%)", valueType: "percent" },
  { slug: "tx_retencao_liquida_7d", label: "Tx. Retenção Líquida 7d (%)", valueType: "percent" },
  { slug: "tx_retencao_liquida_15d", label: "Tx. Retenção Líquida 15d (%)", valueType: "percent" },
  { slug: "d_menos_1", label: "D -1", valueType: "percent" },
  { slug: "atendidas", label: "Atendidas", valueType: "number" },
  { slug: "atendimentos_transfer_texto", label: "Atendimentos Transfer.Texto", valueType: "number" },
  { slug: "transfer", label: "Transfer (%)", valueType: "percent" },
  { slug: "short_call", label: "Short Call (%)", valueType: "percent" },
  { slug: "tma", label: "TMA", valueType: "time" },
  { slug: "rechamada_d1", label: "Rechamada D+1 (%)", valueType: "percent" },
  { slug: "rechamada_d7", label: "Rechamada D+7 (%)", valueType: "percent" },
  { slug: "tabulacao", label: "Tx. Tabulação (%)", valueType: "percent" },
  { slug: "csat", label: "CSAT", valueType: "number" },
  { slug: "csat_0", label: "CSAT 0", valueType: "number" },
  { slug: "engajamento", label: "Engajamento", valueType: "percent" },
  { slug: "tempo_projetado", label: "Tempo Projetado", valueType: "time" },
  { slug: "tempo_login", label: "Tempo de Login", valueType: "time" },
  { slug: "aderencia_login", label: "Aderência Login (%)", valueType: "percent" },
  { slug: "logins_mes", label: "Logins Mês", valueType: "number" },
  { slug: "abs", label: "ABS (%)", valueType: "percent" },
  { slug: "nr17", label: "NR17 (%)", valueType: "percent" },
  { slug: "pre_pausa", label: "Pré Pausa", valueType: "number" },
  { slug: "pre_pausa_pct", label: "Pré pausa (%)", valueType: "percent" },
  { slug: "pessoal_bruto", label: "Pessoal", valueType: "number" },
  { slug: "pessoal", label: "Pessoal (%)", valueType: "percent" },
  { slug: "outras_pausas_bruto", label: "Outras Pausas", valueType: "number" },
  { slug: "outras_pausas", label: "Outras Pausas (%)", valueType: "percent" },
  { slug: "indisp_total", label: "Indisp Total (%)", valueType: "percent" },
  { slug: "aderencia_pausas_pct", label: "Aderência Pausas (%)", valueType: "percent" },
  { slug: "meta_monitoria", label: "Monitorias", valueType: "number" },
  { slug: "meta_feedbacks", label: "Feedbacks", valueType: "number" },
  { slug: "multiplicador", label: "Multiplicador", valueType: "number" },
];

/**
 * Slugs de kpi_definitions criados APENAS para o espelho desta página.
 * Nenhuma outra tela de KPI (/kpi/operadores, /kpi/gestor,
 * /operacao/analise-operadores) deve exibi-los — elas varrem
 * kpi_definitions e precisam pular estes.
 *
 * `retidos_brutos` entra aqui de propósito: em /kpi/operadores ele já é uma
 * coluna VIRTUAL calculada (pedidos − churn); a linha nova em
 * kpi_definitions existe só para o valor BRUTO da planilha aparecer aqui.
 */
export const SLUGS_SOMENTE_ESPELHO = new Set<string>([
  "delta_pedido",
  "delta_pedido_pct",
  "forecast_churn_dia",
  "delta_churn",
  "delta_churn_pct",
  "media_descontos_pct",
  "retidos_brutos",
  "retidos_liquidos_7d",
  "retidos_liquidos_15d",
  "d_menos_1",
  "atendimentos_transfer_texto",
  "csat_0",
  "logins_mes",
  "pre_pausa",
  "pre_pausa_pct",
  "pessoal_bruto",
  "outras_pausas_bruto",
  "aderencia_pausas_pct",
  "multiplicador",
]);
