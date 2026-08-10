/**
 * Tipos do D-1 sobre Supabase (d1_consolidado, d1_tempo_logado,
 * d1_indisponibilidade, d1_operadores_gestor). Copiados (não importados) de
 * src/lib/google/d1/**, src/lib/google/gestor/** e src/lib/d1/** — mesma
 * forma que os componentes de UI já esperam, pra eles não precisarem mudar.
 * Módulo intencionalmente sem qualquer dependência de src/lib/google/.
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
};

export type ResumoEquipe = {
  retidos: number;
  cancelados: number;
  pedidos: number;
  txRetencao: number | null;
  horaReport: string;
};

export type OperadorContratos = {
  email: string;
  cancelados: ContratoItem[];
  retidos: ContratoItem[];
};

export type OperadorMotivos = {
  email: string;
  cancelados: MotivosBreakdown;
  retidos: MotivosBreakdown;
};

/** Visão pessoal de um operador no /d-1/consolidado — mesmo shape de UserD1View (src/lib/d1/filter-by-user.ts). */
export type UserD1View = {
  operador: OperadorConsolidado | null;
  contratos: OperadorContratos | null;
  motivos: OperadorMotivos | null;
  horaReport: string;
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

export type GestorMotivosConsolidados = {
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

export type TempoLogadoResumo = {
  total: number;
  cumpriramMeta: number;
  abaixoDaMeta: number;
  aindaLogados: number;
  ausentes: number;
  tempoMedioSegundos: number;
};

// ═══════════════════════════════════════════════════════════════════
// Tempo Logado — visão do OPERADOR
// ═══════════════════════════════════════════════════════════════════

export type OperadorTempoLogado = {
  email: string;
  tempoLogado: string; // "HH:MM:SS" ou "00:00:00" se sem login
  tempoRestante: string;
  logoutEstimado: string;
};

export type LogoutStatus = "logado" | "deslogado" | "sem_login";

export type OperadorLoginLogout = {
  email: string;
  horaLogin: string | null;
  horaLogout: string | null;
  logoutStatus: LogoutStatus;
};

export type TempoLogadoData = {
  operadores: OperadorTempoLogado[];
  loginLogout: OperadorLoginLogout[];
  horaReport: string;
};

export type UserTempoLogadoView = {
  tempoLogado: OperadorTempoLogado | null;
  loginLogout: OperadorLoginLogout | null;
  horaReport: string;
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

export type IndispResumo = {
  total: number;
  dentroDaMeta: number;
  acimaDaMeta: number;
  ausentes: number;
  indispMediaEquipe: number | null;
};

// ═══════════════════════════════════════════════════════════════════
// Indisponibilidade — visão do OPERADOR
// ═══════════════════════════════════════════════════════════════════

export type OperadorIndisp = {
  email: string;
  indispPercent: number | null; // ex: 12.3 (não 0.123)
  tempoLogado: string;
};

/** Ver nota de PausasDetalhe acima — pausaOperacional idem sem coluna própria. */
export type OperadorPausa = {
  email: string;
  tempoIndisponivel: string;
  pausa10: string;
  pausa20: string;
  pausaParticular: string;
  pausaMonitoramento: string;
  pausaTreinamento: string;
  pausaFeedback: string;
  pausaPrePausa: string;
  pausaAtivo: string;
  pausaTakeBlip: string;
  pausaOperacional: string;
  pausaEmail: string;
  pausaIndisponivel: string;
  pausaSistema: string;
  nr17: string;
};

export type IndisponibilidadeData = {
  operadoresIndisp: OperadorIndisp[];
  operadoresPausa: OperadorPausa[];
  horaReport: string;
};

export type UserIndispView = {
  indisp: OperadorIndisp | null;
  pausa: OperadorPausa | null;
  horaReport: string;
};

// ═══════════════════════════════════════════════════════════════════
// Operadores por gestor (d1_operadores_gestor)
// ═══════════════════════════════════════════════════════════════════

export type OperadorD1 = {
  email: string;
};
