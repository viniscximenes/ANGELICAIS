const ORDEM_TABELA_VALUES = [
  "padrao",
  "tx_desc",
  "tx_asc",
  "retidos_desc",
  "retidos_asc",
  "cancelados_desc",
  "pedidos_desc",
] as const;

export type OrdemTabela = (typeof ORDEM_TABELA_VALUES)[number];

export const ORDEM_TABELA_OPTIONS: { value: OrdemTabela; label: string }[] = [
  { value: "padrao", label: "Padrão" },
  { value: "tx_desc", label: "Maior Taxa Primeiro" },
  { value: "tx_asc", label: "Menor Taxa Primeiro" },
  { value: "retidos_desc", label: "Mais Retidos Primeiro" },
  { value: "retidos_asc", label: "Menos Retidos Primeiro" },
  { value: "cancelados_desc", label: "Mais Cancelados Primeiro" },
  { value: "pedidos_desc", label: "Mais Pedidos Primeiro" },
];

export function isOrdemTabela(value: string): value is OrdemTabela {
  return (ORDEM_TABELA_VALUES as readonly string[]).includes(value);
}

export type ConfigTabela = {
  metaTxRetencao: number;
  ordemTabela: OrdemTabela;
  showRvDiario: boolean;
};

/**
 * Meta padrão de TX Retenção (%) pra quem nunca salvou uma — gestor (tabela
 * do Consolidado) e coordenador (meta do polo). O rótulo "Padrão N%" dos
 * dois popovers lê daqui; a coluna gestor_config_fantasia.meta_tx_retencao
 * tem o mesmo default no banco.
 */
export const DEFAULT_META_TX_RETENCAO = 63;
export const DEFAULT_ORDEM_TABELA: OrdemTabela = "padrao";
export const DEFAULT_SHOW_RV_DIARIO = false;
