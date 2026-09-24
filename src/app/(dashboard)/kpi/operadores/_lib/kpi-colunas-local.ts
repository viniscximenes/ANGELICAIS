import { KPI_COLUNAS_ORDER } from "@/lib/kpi/gestor/kpi-colunas-config";
import { RETIDOS_BRUTOS_SLUG } from "@/lib/kpi/gestor/retidos-brutos";

/**
 * Extensão LOCAL (só desta rota) de KPI_COLUNAS_ORDER (lib/kpi/gestor,
 * compartilhado, NÃO alterado) — acrescenta os 4 KPIs novos pedidos nesta
 * rodada:
 *  - tempo_projetado / tempo_login: já existem em kpi_definitions
 *    (group_type "secundario"), mas SECUNDARIO_SLUGS_ORDER (serial-types.ts,
 *    compartilhado) não os lista, então nunca chegam em op.secundarios.
 *    Os valores brutos são extraídos à parte em extract-kpis-extras.ts
 *    (direto do dado cru do server, antes de toKpiEquipeSerial filtrar).
 *  - multiplicador: mesma situação (existe em kpi_definitions, mas fora de
 *    SECUNDARIO_SLUGS_ORDER).
 *  - tempo_restante: 100% virtual, só nesta página (como retidos_brutos),
 *    calculado localmente em celula-tempo-restante.ts.
 */
export const TEMPO_PROJETADO_SLUG = "tempo_projetado";
export const TEMPO_LOGIN_SLUG = "tempo_login";
export const MULTIPLICADOR_SLUG = "multiplicador";
export const TEMPO_RESTANTE_SLUG = "tempo_restante";

export const NOVOS_KPI_SLUGS_LOCAL = [
  TEMPO_PROJETADO_SLUG,
  TEMPO_LOGIN_SLUG,
  MULTIPLICADOR_SLUG,
  TEMPO_RESTANTE_SLUG,
] as const;

/** Labels dos KPIs virtuais/extras locais — usados quando não há linha em
 *  kpi_definitions (tempo_restante) ou como fallback. */
export const LABELS_KPI_LOCAL: Record<string, string> = {
  [TEMPO_PROJETADO_SLUG]: "Tempo Projetado",
  [TEMPO_LOGIN_SLUG]: "Tempo de Login",
  [MULTIPLICADOR_SLUG]: "Multiplicador",
  [TEMPO_RESTANTE_SLUG]: "Tempo Restante",
};

/**
 * Todos os slugs selecionáveis como coluna nesta rota — os de sempre
 * (KPI_COLUNAS_ORDER, compartilhado) + os 4 novos locais.
 */
export const KPI_COLUNAS_ORDER_LOCAL: readonly string[] = [
  ...KPI_COLUNAS_ORDER,
  ...NOVOS_KPI_SLUGS_LOCAL,
];

export function isKpiColunaSlugLocal(value: string): boolean {
  return KPI_COLUNAS_ORDER_LOCAL.includes(value);
}

export { RETIDOS_BRUTOS_SLUG };
