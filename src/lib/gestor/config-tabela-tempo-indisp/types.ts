const ORDEM_TABELA_TEMPO_INDISP_VALUES = [
  "padrao",
  "tempo_logado_desc",
  "tempo_logado_asc",
  "indisp_desc",
  "indisp_asc",
] as const;

export type OrdemTabelaTempoIndisp = (typeof ORDEM_TABELA_TEMPO_INDISP_VALUES)[number];

export const ORDEM_TABELA_TEMPO_INDISP_OPTIONS: { value: OrdemTabelaTempoIndisp; label: string }[] = [
  { value: "padrao", label: "Padrão" },
  { value: "tempo_logado_desc", label: "Maior Tempo Logado → Menor" },
  { value: "tempo_logado_asc", label: "Menor Tempo Logado → Maior" },
  { value: "indisp_desc", label: "Maior Indisp. % → Menor" },
  { value: "indisp_asc", label: "Menor Indisp. % → Maior" },
];

export function isOrdemTabelaTempoIndisp(value: string): value is OrdemTabelaTempoIndisp {
  return (ORDEM_TABELA_TEMPO_INDISP_VALUES as readonly string[]).includes(value);
}

export type ConfigTabelaTempoIndisp = {
  metaIndisponibilidade: number;
  ordemTabela: OrdemTabelaTempoIndisp;
};

/** Mesmo valor de META_INDISPONIBILIDADE (src/lib/d1-db/types.ts) — default da coluna gestor_config_fantasia.meta_indisponibilidade. */
export const DEFAULT_META_INDISPONIBILIDADE = 14.5;
export const DEFAULT_ORDEM_TABELA_TEMPO_INDISP: OrdemTabelaTempoIndisp = "padrao";
