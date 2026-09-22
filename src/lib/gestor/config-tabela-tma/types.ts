const ORDEM_TABELA_TMA_VALUES = [
  "padrao",
  "tma_asc",
  "tma_desc",
  "qtd_desc",
  "qtd_asc",
] as const;

export type OrdemTabelaTma = (typeof ORDEM_TABELA_TMA_VALUES)[number];

export const ORDEM_TABELA_TMA_OPTIONS: { value: OrdemTabelaTma; label: string }[] = [
  { value: "padrao", label: "Padrão" },
  { value: "tma_asc", label: "Menor TMA → Maior TMA" },
  { value: "tma_desc", label: "Maior TMA → Menor TMA" },
  { value: "qtd_desc", label: "Mais Atendido → Menos Atendido" },
  { value: "qtd_asc", label: "Menos Atendido → Mais Atendido" },
];

export function isOrdemTabelaTma(value: string): value is OrdemTabelaTma {
  return (ORDEM_TABELA_TMA_VALUES as readonly string[]).includes(value);
}

export const DEFAULT_ORDEM_TABELA_TMA: OrdemTabelaTma = "padrao";
