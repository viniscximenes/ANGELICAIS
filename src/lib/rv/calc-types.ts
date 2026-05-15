import type {
  BinaryIndicator,
  CombinedBonus,
  DeflatorType,
  Faixa,
  TieredIndicator,
} from "./types";

/**
 * Status possíveis do RV calculado.
 */
export type RvStatus =
  | "indisponivel_status"
  | "nao_elegivel"
  | "sem_dados"
  | "ok";

export type IndisponibilidadeMotivo = {
  status: string;
  mensagem: string;
};

export type TieredResult = {
  indicator: TieredIndicator;
  valorAtual: number | null;
  faixaAtingida: Faixa | null;
  valorGanho: number;
  preRequisitoAtendido: boolean;
  proximaFaixa: Faixa | null;
};

export type BinaryResult = {
  indicator: BinaryIndicator;
  valorAtual: number | null;
  atingiu: boolean;
  valorGanho: number;
};

export type BonusConditionResult = {
  kpiSlug: string;
  comparison: string;
  threshold: number;
  valorAtual: number | null;
  atingiu: boolean;
};

export type CombinedBonusResult = {
  bonus: CombinedBonus;
  conditionResults: BonusConditionResult[];
  todasAtingidas: boolean;
  ainda_possivel: boolean;
  motivoImpossivel: string | null;
  valorGanho: number;
};

export type DeflatorResult = {
  deflatorType: DeflatorType;
  ocorrencias: number;
  percentTotal: number;
  origem: "automatico" | "manual";
};

export type RvCalculation = {
  status: RvStatus;

  motivoIndisponibilidade?: IndisponibilidadeMotivo;
  motivoNaoElegivel?: string;

  bruto: number;
  multiplicadorPedidos: number;
  subtotal: number;
  somaDescontosPct: number;
  liquido: number;

  tetoBase: number;
  tetoPossivel: number;
  valorTravadoImpossivel: number;

  tieredResults: TieredResult[];
  binaryResults: BinaryResult[];
  combinedBonusResults: CombinedBonusResult[];
  deflatorResults: DeflatorResult[];
};
