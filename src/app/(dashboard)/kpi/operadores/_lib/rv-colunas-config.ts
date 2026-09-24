/**
 * Colunas de RV configuráveis desta rota — ids ESTÁVEIS (gravados em
 * gestor_config_fantasia.kpi_colunas_rv), independentes dos slugs de
 * indicador/sort usados internamente por kpi-equipe-section.tsx.
 *
 * Padrão (kpi_colunas_rv NULL) = todas visíveis — exatamente o que a tabela
 * já mostrava antes desta rodada (nenhuma delas era configurável).
 */
export type RvColunaId =
  | "rv_indisp"
  | "rv_tma"
  | "rv_bonus"
  | "rv_multiplicador"
  | "rv_ticket"
  | "rv_total";

export const RV_COLUNA_LABELS: Record<RvColunaId, string> = {
  rv_indisp: "Indisp (RV)",
  rv_tma: "TMA (RV)",
  rv_bonus: "Bônus (RV)",
  rv_multiplicador: "Multiplicador (RV)",
  rv_ticket: "Ticket (RV)",
  rv_total: "RV (Total)",
};

/**
 * Ordem de exibição no popover (não é necessariamente a ordem de renderização
 * na tabela — essa depende da coluna de origem estar visível ou não, ver
 * kpi-equipe-section.tsx) e também a ordem de fallback quando a coluna de
 * origem está oculta: INDISP, TMA, BÔNUS, MULTIPLICADOR, TICKET, RV (TOTAL).
 */
export const RV_COLUNA_ORDER: RvColunaId[] = [
  "rv_indisp",
  "rv_tma",
  "rv_bonus",
  "rv_multiplicador",
  "rv_ticket",
  "rv_total",
];

export const DEFAULT_RV_COLUNAS: RvColunaId[] = [...RV_COLUNA_ORDER];

export function isRvColunaId(value: string): value is RvColunaId {
  return (RV_COLUNA_ORDER as string[]).includes(value);
}
