/**
 * Tipos da camada de leitura do Painel do Gestor (guia dedicada por gestor,
 * ex.: "ANA ANGELICA"). Estrutura mapeada em docs/pages/gestor-d-1.md.
 *
 * Fase 1: apenas leitura da guia da equipe. A escrita/upload (BASE - 1) é
 * tratada em fase posterior.
 */

export type MotivosBreakdown = {
  financeiro: number;
  mudancaEndereco: number;
  insatisfacaoServico: number;
  insatisfacaoAtendimento: number;
  mudancaProvedora: number;
  outros: number;
};

/** Uma linha de operador (A–F) + seus motivos (S–AD), lidos da mesma linha. */
export type GestorOperadorLinha = {
  nome: string; // A
  gestora: string; // B
  retidos: number; // C
  cancelados: number; // D
  pedidos: number; // E
  txRetencao: number | null; // F
  motivosRetidos: MotivosBreakdown; // S–X
  motivosCancelados: MotivosBreakdown; // Y–AD
};

/** Consolidado da equipe (H–L), uma única linha. */
export type GestorConsolidado = {
  gestora: string; // H
  retidos: number; // I
  cancelados: number; // J
  pedidos: number; // K
  txRetencao: number | null; // L
};

export type GestorContrato = {
  contrato: string;
  cliente: string;
  operador: string; // email do operador dono (coluna A da linha)
};

/** Motivos consolidados da equipe (AF–AQ), soma dos operadores. */
export type GestorMotivosConsolidados = {
  retidos: MotivosBreakdown; // AF–AK
  cancelados: MotivosBreakdown; // AL–AQ
};

/** Tx de retenção por motivo (AS–AX), uma única linha. */
export type TxPorMotivo = {
  financeiro: number | null;
  mudancaEndereco: number | null;
  insatisfacaoServico: number | null;
  insatisfacaoAtendimento: number | null;
  mudancaProvedora: number | null;
  outros: number | null;
};

export type GestorData = {
  operadores: GestorOperadorLinha[];
  consolidado: GestorConsolidado;
  contratosRetidos: GestorContrato[];
  contratosCancelados: GestorContrato[];
  motivosConsolidados: GestorMotivosConsolidados;
  txPorMotivo: TxPorMotivo;
};
