export type OperadorConsolidado = {
  email: string;
  retidos: number;
  cancelados: number;
  pedidos: number;
  txRetencao: number | null;
};

export type ResumoEquipe = {
  retidos: number;
  cancelados: number;
  pedidos: number;
  txRetencao: number | null;
  horaReport: string;
};

export type ContratoItem = {
  contrato: string;
  cliente: string;
};

export type OperadorContratos = {
  email: string;
  cancelados: ContratoItem[];
  retidos: ContratoItem[];
};

export type MotivosBreakdown = {
  financeiro: number;
  mudancaEndereco: number;
  insatisfacaoServico: number;
  insatisfacaoAtendimento: number;
  mudancaProvedora: number;
  outros: number;
};

export type OperadorMotivos = {
  email: string;
  cancelados: MotivosBreakdown;
  retidos: MotivosBreakdown;
};

export type D1Data = {
  consolidado: {
    operadores: OperadorConsolidado[];
    equipe: ResumoEquipe;
  };
  contratos: OperadorContratos[];
  motivos: OperadorMotivos[];
};
