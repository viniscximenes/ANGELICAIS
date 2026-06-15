export type OperadorConsolidado = {
  email: string;
  supervisor: string;
  retidos: number;
  cancelados: number;
  pedidos: number;
  txRetencao: number | null;
};

/**
 * Totais pré-calculados de um supervisor, lidos de um bloco H:K da guia
 * CONSOLIDADO (nome em célula mesclada H:K + linha de dados abaixo).
 */
export type TotaisSupervisor = {
  supervisor: string;
  retidos: number;
  cancelados: number;
  pedidos: number;
  txRetencao: number | null;
};

/**
 * Forma "achatada" dos totais de uma equipe + hora do report.
 * Mantida para os componentes de tabela/PNG (EquipeTable, CopyTableButton),
 * que ainda recebem uma única equipe por vez.
 */
export type ResumoEquipe = {
  retidos: number;
  cancelados: number;
  pedidos: number;
  txRetencao: number | null;
  horaReport: string;
};

/**
 * Retorno da leitura da guia CONSOLIDADO (empresa toda).
 * - operadores: todas as linhas (com supervisor na coluna B)
 * - totaisPorSupervisor: um bloco H:K por supervisor
 * - horaReport: célula M2
 */
export type ConsolidadoData = {
  operadores: OperadorConsolidado[];
  totaisPorSupervisor: TotaisSupervisor[];
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
  consolidado: ConsolidadoData;
  contratos: OperadorContratos[];
  motivos: OperadorMotivos[];
};
