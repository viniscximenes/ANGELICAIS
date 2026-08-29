/** Slug do KPI de retenção usado no card com engrenagem de meta. */
export const TX_RETENCAO_SLUG = "tx_retencao_bruta";

/**
 * KPIs "principais" DESTA feature (gráfico grande + faixa de quartil).
 * Classificação LOCAL — não é kpi_definitions.group_type (esse é global e
 * usado por /kpi/operadores). Qualquer KPI de kpi_definitions fora desta
 * lista cai no grid de secundários.
 */
export const PRINCIPAIS_SLUGS: string[] = [
  "tx_retencao_bruta",
  "tma",
  "abs",
  "indisp_total",
];
