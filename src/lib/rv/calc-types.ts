import type {
  BinaryIndicator,
  CombinedBonus,
  DeflatorType,
  Faixa,
  PerUnitFaixa,
  PerUnitIndicator,
  TieredIndicator,
} from "./types";

/**
 * Status possíveis do RV calculado.
 */
type RvStatus =
  | "indisponivel_status"
  | "nao_elegivel"
  | "sem_dados"
  | "ok";

type IndisponibilidadeMotivo = {
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

export type PerUnitResult = {
  indicator: PerUnitIndicator;
  txAtual: number | null;
  faixaAtingida: PerUnitFaixa | null;
  valorPorRetido: number; // R$/retido da faixa (0 se nenhuma)
  contagemRetidos: number; // retido bruto calculado
  valorGanho: number; // valorPorRetido × contagemRetidos
  proximaFaixa: PerUnitFaixa | null; // pra mostrar potencial
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
  perUnitResults: PerUnitResult[];
  deflatorResults: DeflatorResult[];
};
