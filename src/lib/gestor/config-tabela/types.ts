export const ORDEM_TABELA_VALUES = [
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
  { value: "tx_desc", label: "Maior TX → Menor TX" },
  { value: "tx_asc", label: "Menor TX → Maior TX" },
  { value: "retidos_desc", label: "Mais Retidos → Menos Retidos" },
  { value: "retidos_asc", label: "Menos Retidos → Mais Retidos" },
  { value: "cancelados_desc", label: "Mais Cancelados → Menos Cancelados" },
  { value: "pedidos_desc", label: "Mais Pedidos → Menos Pedidos" },
];

export function isOrdemTabela(value: string): value is OrdemTabela {
  return (ORDEM_TABELA_VALUES as readonly string[]).includes(value);
}

export type ConfigTabela = {
  metaTxRetencao: number;
  ordemTabela: OrdemTabela;
};

export const DEFAULT_META_TX_RETENCAO = 60;
export const DEFAULT_ORDEM_TABELA: OrdemTabela = "padrao";
