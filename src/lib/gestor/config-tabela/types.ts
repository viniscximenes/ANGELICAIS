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
  { value: "tx_desc", label: "Maior taxa primeiro" },
  { value: "tx_asc", label: "Menor taxa primeiro" },
  { value: "retidos_desc", label: "Mais retidos primeiro" },
  { value: "retidos_asc", label: "Menos retidos primeiro" },
  { value: "cancelados_desc", label: "Mais cancelados primeiro" },
  { value: "pedidos_desc", label: "Mais pedidos primeiro" },
];

export function isOrdemTabela(value: string): value is OrdemTabela {
  return (ORDEM_TABELA_VALUES as readonly string[]).includes(value);
}

export type ConfigTabela = {
  metaTxRetencao: number;
  ordemTabela: OrdemTabela;
  showRvDiario: boolean;
};

export const DEFAULT_META_TX_RETENCAO = 60;
export const DEFAULT_ORDEM_TABELA: OrdemTabela = "padrao";
export const DEFAULT_SHOW_RV_DIARIO = false;
