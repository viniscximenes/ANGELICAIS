export type EvolucaoIndicador =
  | "tx_retencao"
  | "pedidos"
  | "indisponibilidade"
  | "abs"
  | "tma";

// Mapeia o indicador do painel pro slug real no snapshot
export const INDICADOR_SLUG: Record<EvolucaoIndicador, string> = {
  tx_retencao: "tx_retencao_bruta",
  pedidos: "pedidos",
  indisponibilidade: "indisp_total",
  abs: "abs",
  tma: "tma",
};

export const INDICADOR_LABEL: Record<EvolucaoIndicador, string> = {
  tx_retencao: "Tx de Retenção",
  pedidos: "Pedidos",
  indisponibilidade: "Indisponibilidade",
  abs: "ABS",
  tma: "TMA",
};

// Tipo de consolidado por indicador
export const INDICADOR_CONSOLIDADO: Record<
  EvolucaoIndicador,
  "acumulado" | "media"
> = {
  tx_retencao: "acumulado",
  pedidos: "media",
  indisponibilidade: "media",
  abs: "media",
  tma: "media",
};

// Um ponto da série: um mês com o valor de um indicador
export type PontoEvolucao = {
  mesRef: string; // "2026-06-01"
  valor: number | null; // valor do indicador naquele mês
  status: string | null; // meta_status do operador naquele mês (ex: "Férias")
  statusInativo: boolean; // true se o operador não estava ativo no mês
};

// Série completa de um indicador (todos os meses)
export type SerieIndicador = {
  indicador: EvolucaoIndicador;
  pontos: PontoEvolucao[];
  consolidado: number | null; // acumulado ou média (só meses ativos)
  tipoConsolidado: "acumulado" | "media";
  mesesConsiderados: number; // qtd de meses ativos que entraram no consolidado
};

// Dado bruto de um mês (pra calcular consolidado da TX)
export type MesBruto = {
  mesRef: string;
  txRetencao: number | null;
  pedidos: number | null;
  churn: number | null;
  indisp: number | null;
  abs: number | null;
  tma: number | null;
  status: string | null; // meta_status do operador (null/vazio = ativo)
};

// Retorno completo do painel
export type EvolucaoOperador = {
  operatorEmail: string;
  meses: string[]; // lista ordenada de meses (asc)
  series: Record<EvolucaoIndicador, SerieIndicador>;
};
