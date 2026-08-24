import { PRINCIPAL_SLUGS_ORDER, SECUNDARIO_SLUGS_ORDER } from "./serial-types";

/**
 * Todos os slugs de KPI que podem ser escolhidos como coluna da tabela de
 * /operacional/kpi (principais + secundários), na ordem em que aparecem
 * quando visíveis. Mesmos slugs reais de PRINCIPAL_SLUGS_ORDER/
 * SECUNDARIO_SLUGS_ORDER (serial-types.ts) — o gestor pode promover um KPI
 * secundário (hoje só no modal de detalhe) pra coluna da tabela principal.
 */
export const KPI_COLUNAS_ORDER = [
  ...PRINCIPAL_SLUGS_ORDER,
  ...SECUNDARIO_SLUGS_ORDER,
] as const;

export type KpiColunaSlug = (typeof KPI_COLUNAS_ORDER)[number];

export function isKpiColunaSlug(value: string): value is KpiColunaSlug {
  return (KPI_COLUNAS_ORDER as readonly string[]).includes(value);
}

/**
 * Default quando gestor_config_fantasia.kpi_colunas_visiveis está vazio
 * ([]) — lista explícita (não deriva mais de PRINCIPAL_SLUGS_ORDER: a ordem
 * pedida difere da ordem canônica — "retidos_brutos" vem depois de "abs",
 * não logo após "tx_retencao_bruta").
 *
 * "churn" e "pedidos" ficam de fora do default, mas continuam em
 * PRINCIPAL_SLUGS_ORDER (seguem disponíveis no seletor de colunas pra quem
 * quiser adicionar manualmente). Gestores que já salvaram uma configuração
 * própria não são afetados — getKpiColunasConfig só cai neste default
 * quando a lista salva está vazia ou inválida.
 */
export const DEFAULT_KPI_COLUNAS_VISIVEIS: string[] = [
  "tx_retencao_bruta",
  "indisp_total",
  "tma",
  "abs",
  "retidos_brutos",
  "variacao_ticket",
];
