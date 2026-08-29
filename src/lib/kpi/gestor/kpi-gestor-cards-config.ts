import type { KpiValueType } from "@/lib/kpi/types";

export type KpiGestorSecao = "principais" | "complementares";

type KpiGestorCardConfig = {
  /** Chave em gestor_config_fantasia.kpi_gestor_metas (jsonb). */
  configSlug: string;
  /** kpi_slug real em kpi_gestor_snapshots/kpi_monthly_snapshots — diverge do configSlug em alguns casos (ver comentário abaixo). */
  dataSlug: string;
  label: string;
  valueType: KpiValueType;
  secao: KpiGestorSecao;
};

/**
 * Cards de /kpi/gestor. `dataSlug` só diverge de `configSlug` pra
 * tx_retencao_liq_15d/7d — a coluna de metas usa "liq" mas o dado real em
 * kpi_gestor_snapshots/kpi_monthly_snapshots usa "liquida" (ver
 * DEFAULT_KPI_GESTOR_METAS abaixo, que é o default real da coluna no banco).
 * Quando não há linha em kpi_gestor_snapshots pro slug/mês (fonte ainda não
 * chegou, ou operador sem dado), o card mostra "N/D" (ver buildKpiGestorCards).
 */
export const KPI_GESTOR_CARDS: KpiGestorCardConfig[] = [
  // ── Principais ──────────────────────────────────────────────
  { configSlug: "pedidos", dataSlug: "pedidos", label: "Pedidos", valueType: "number", secao: "principais" },
  { configSlug: "churn", dataSlug: "churn", label: "Churn", valueType: "number", secao: "principais" },
  { configSlug: "variacao_ticket", dataSlug: "variacao_ticket", label: "% Variação Ticket", valueType: "percent_negative", secao: "principais" },
  { configSlug: "tx_retencao_bruta", dataSlug: "tx_retencao_bruta", label: "Tx. Retenção Bruta", valueType: "percent", secao: "principais" },
  { configSlug: "tma", dataSlug: "tma", label: "TMA", valueType: "time", secao: "principais" },
  { configSlug: "abs", dataSlug: "abs", label: "ABS", valueType: "percent", secao: "principais" },
  { configSlug: "indisp_total", dataSlug: "indisp_total", label: "Indisponibilidade", valueType: "percent", secao: "principais" },

  // ── Complementares ──────────────────────────────────────────
  { configSlug: "tx_retencao_liq_15d", dataSlug: "tx_retencao_liquida_15d", label: "Tx. Retenção Liq. 15d", valueType: "percent", secao: "complementares" },
  { configSlug: "tx_retencao_liq_7d", dataSlug: "tx_retencao_liquida_7d", label: "Tx. Retenção Liq. 7d", valueType: "percent", secao: "complementares" },
  { configSlug: "atendidas", dataSlug: "atendidas", label: "Atendidas", valueType: "number", secao: "complementares" },
  { configSlug: "transfer", dataSlug: "transfer", label: "Transfer", valueType: "percent", secao: "complementares" },
  { configSlug: "short_call", dataSlug: "short_call", label: "Short Call", valueType: "percent", secao: "complementares" },
  { configSlug: "rechamada_d1", dataSlug: "rechamada_d1", label: "Rechamada D+1", valueType: "percent", secao: "complementares" },
  { configSlug: "rechamada_d7", dataSlug: "rechamada_d7", label: "Rechamada D+7", valueType: "percent", secao: "complementares" },
  { configSlug: "tabulacao", dataSlug: "tabulacao", label: "Tx. Tabulação", valueType: "percent", secao: "complementares" },
  { configSlug: "csat", dataSlug: "csat", label: "CSAT", valueType: "number", secao: "complementares" },
  { configSlug: "engajamento", dataSlug: "engajamento", label: "Engajamento", valueType: "percent", secao: "complementares" },
  { configSlug: "tempo_projetado", dataSlug: "tempo_projetado", label: "Tempo Projetado", valueType: "time", secao: "complementares" },
  { configSlug: "tempo_login", dataSlug: "tempo_login", label: "Tempo de Login", valueType: "time", secao: "complementares" },
  { configSlug: "aderencia_login", dataSlug: "aderencia_login", label: "Aderência Login", valueType: "percent", secao: "complementares" },
  { configSlug: "nr17", dataSlug: "nr17", label: "NR17", valueType: "percent", secao: "complementares" },
  { configSlug: "pessoal", dataSlug: "pessoal", label: "Pessoal", valueType: "percent", secao: "complementares" },
  { configSlug: "outras_pausas", dataSlug: "outras_pausas", label: "Outras Pausas", valueType: "percent", secao: "complementares" },
];

/**
 * Espelha o DEFAULT da coluna gestor_config_fantasia.kpi_gestor_metas —
 * usado como fallback antes de o gestor ter uma linha salva na tabela.
 */
export const DEFAULT_KPI_GESTOR_METAS: Record<
  string,
  { meta: number | string | null; direcao: "gte" | "lte" | "forecast" | "diff_bruta" | null }
> = {
  abs: { meta: 5, direcao: "lte" },
  tma: { meta: "12:11", direcao: "lte" },
  csat: { meta: null, direcao: null },
  nr17: { meta: 10.5, direcao: "lte" },
  churn: { meta: null, direcao: "forecast" },
  pedidos: { meta: null, direcao: null },
  pessoal: { meta: null, direcao: null },
  transfer: { meta: 3, direcao: "lte" },
  atendidas: { meta: null, direcao: null },
  tabulacao: { meta: null, direcao: null },
  short_call: { meta: 2, direcao: "lte" },
  engajamento: { meta: null, direcao: null },
  tempo_login: { meta: null, direcao: null },
  indisp_total: { meta: 14.5, direcao: "lte" },
  rechamada_d1: { meta: 19, direcao: "lte" },
  rechamada_d7: { meta: 19, direcao: "lte" },
  outras_pausas: { meta: null, direcao: null },
  forecast_churn: { meta: null, direcao: null },
  aderencia_login: { meta: 90, direcao: "gte" },
  tempo_projetado: { meta: null, direcao: null },
  variacao_ticket: { meta: null, direcao: null },
  tx_retencao_bruta: { meta: 63, direcao: "gte" },
  tx_retencao_liq_7d: { meta: -5, direcao: "diff_bruta" },
  tx_retencao_liq_15d: { meta: -5, direcao: "diff_bruta" },
};
