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
 * ([]) — as 7 colunas principais que já apareciam antes dessa configuração
 * existir.
 */
export const DEFAULT_KPI_COLUNAS_VISIVEIS: string[] = [...PRINCIPAL_SLUGS_ORDER];
