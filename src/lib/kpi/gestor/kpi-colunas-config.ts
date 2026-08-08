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
 * ([]) — as colunas principais, MENOS "churn". Como deriva de
 * PRINCIPAL_SLUGS_ORDER, já inclui o KPI virtual "retidos_brutos"
 * (pedidos − churn), logo após tx_retencao_bruta.
 *
 * Churn continua em PRINCIPAL_SLUGS_ORDER (segue sendo serializado e
 * aparecendo no seletor de colunas); ele só deixou de vir marcado por
 * padrão. Gestores que já salvaram uma configuração própria não são
 * afetados — getKpiColunasConfig só cai neste default quando a lista salva
 * está vazia ou inválida.
 */
const DEFAULT_OCULTAS = ["churn"];

export const DEFAULT_KPI_COLUNAS_VISIVEIS: string[] = PRINCIPAL_SLUGS_ORDER.filter(
  (slug) => !DEFAULT_OCULTAS.includes(slug),
);
