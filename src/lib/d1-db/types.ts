/**
 * Tipos do D-1 sobre Supabase (d1_consolidado, d1_tempo_logado,
 * d1_indisponibilidade, d1_operadores_gestor).
 */

// ═══════════════════════════════════════════════════════════════════
// Consolidado — compartilhado
// ═══════════════════════════════════════════════════════════════════

export type MotivosBreakdown = {
  financeiro: number;
  mudancaEndereco: number;
  insatisfacaoServico: number;
  insatisfacaoAtendimento: number;
  mudancaProvedora: number;
  outros: number;
};

export type ContratoItem = {
  contrato: string;
  cliente: string;
};

// ═══════════════════════════════════════════════════════════════════
// Consolidado — visão do OPERADOR
// ═══════════════════════════════════════════════════════════════════

export type OperadorConsolidado = {
  email: string;
  /** Email real do operador — usado como React key quando email contém nome fantasia. */
  emailOriginal?: string;
  supervisor: string;
  retidos: number;
  cancelados: number;
  pedidos: number;
  txRetencao: number | null;
  /** RV Diário — faixa do RV do mês (rv_per_unit_indicators) aplicada à tx/retidos do dia. Opcional: só calculado onde a coluna "RV Diário" existe (reports/consolidado). */
  rvDiario?: number | null;
};

export type ResumoEquipe = {
  retidos: number;
  cancelados: number;
  pedidos: number;
  txRetencao: number | null;
  horaReport: string;
  /** Soma do rvDiario de todos os operadores — ver OperadorConsolidado.rvDiario. */
  rvDiario?: number | null;
};

// ═══════════════════════════════════════════════════════════════════
// Consolidado — visão do GESTOR
// ═══════════════════════════════════════════════════════════════════

export type GestorOperadorLinha = {
  nome: string; // email do operador (nome histórico da coluna A do Sheets)
  gestora: string;
  retidos: number;
  cancelados: number;
  pedidos: number;
  txRetencao: number | null;
  motivosRetidos: MotivosBreakdown;
  motivosCancelados: MotivosBreakdown;
};

export type GestorConsolidado = {
  gestora: string;
  retidos: number;
  cancelados: number;
  pedidos: number;
  txRetencao: number | null;
};

export type GestorContrato = {
  contrato: string;
  cliente: string;
  operador: string; // email do operador dono
};

type GestorMotivosConsolidados = {
  retidos: MotivosBreakdown;
  cancelados: MotivosBreakdown;
};

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

// ═══════════════════════════════════════════════════════════════════
// Tempo Logado — visão do GESTOR
// ═══════════════════════════════════════════════════════════════════

export const META_TEMPO_LOGADO_SEGUNDOS = 22800; // 06:20:00

export type StatusPresenca = "completo" | "ainda_logado" | "ausente";

export type GestorTempoLogadoLinha = {
  email: string;
  gestor: string;
  tempoLogado: string; // "HH:MM:SS"
  tempoLogadoSegundos: number;
  cumpriuMeta: boolean;
  logoutEstimado: string;
  horaLogin: string | null;
  horaLogout: string | null;
  status: StatusPresenca;
};

export type GestorTempoLogadoData = {
  operadores: GestorTempoLogadoLinha[];
  horaReport?: string;
  nomeSupervisorReport?: string | null;
};

// ═══════════════════════════════════════════════════════════════════
// Indisponibilidade — visão do GESTOR
// ═══════════════════════════════════════════════════════════════════

export const META_INDISPONIBILIDADE = 14.5; // %; cumpriu se indisponibilidade < 14.5

/**
 * Detalhamento de pausas — mantido no formato histórico (16 campos) por
 * compatibilidade com IndisponibilidadePausasTable. A tabela nova
 * (d1_indisponibilidade) NÃO tem coluna própria para pausa15, pausa40,
 * operacional e pausaSemMotivo (existiam no Sheets antigo, sem
 * equivalente no schema atual) — ficam sempre "00:00:00" até o schema
 * ganhar essas colunas, se algum dia for preciso. Ver observação no
 * relatório de migração.
 */
export type PausasDetalhe = {
  pausa10: string;
  pausa20: string;
  pausaParticular: string;
  monOuTaref: string;
  trenOuReun: string;
  feedback: string;
  prePausa: string;
  ativo: string;
  takeBlip: string;
  pausa15: string;
  pausa40: string;
  operacional: string;
  email: string;
  indisponivel: string;
  sistema: string;
  pausaSemMotivo: string;
};

export type GestorIndispLinha = {
  email: string;
  gestor?: string;
  indisponibilidade: number | null;
  cumpriuMeta: boolean;
  nr17Pct: number | null;
  pausaParticularPct: number | null;
  outrasPausasPct: number | null;
  pausas: PausasDetalhe;
  /**
   * Hora real de início de cada pausa, "HH:MM:SS" — de d1_indisponibilidade
   * (colunas pausa10_1_hora_inicio/pausa10_2_hora_inicio/pausa20_hora_inicio,
   * capturadas do CSV a partir do upload que adicionou esse dado; uploads
   * anteriores ficam null). Usado só pela aderência de Tempo/Indisp.
   */
  pausa10PrimeiraHora: string | null;
  pausa10SegundaHora: string | null;
  pausa20Hora: string | null;
};

export type GestorIndispData = {
  operadores: GestorIndispLinha[];
  horaReport?: string;
  nomeSupervisorReport?: string | null;
};
