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
  tempoLogado: string; // "HH:MM:SS"
  tempoLogadoSegundos: number;
  cumpriuMeta: boolean;
  horaLogin: string | null;
  horaLogout: string | null;
  status: StatusPresenca;
};

export type GestorTempoLogadoData = {
  operadores: GestorTempoLogadoLinha[];
  /** Falha de banco (roster ou d1_tempo_logado) — a página mostra erro, não "sem dados". */
  erro: boolean;
  horaReport?: string;
  nomeSupervisorReport?: string | null;
  /** Dias (YYYY-MM-DD) da base do último upload — coluna DATE da base, não o dia do upload. */
  reportDatasBase?: string[] | null;
};

// ═══════════════════════════════════════════════════════════════════
// Indisponibilidade — visão do GESTOR
// ═══════════════════════════════════════════════════════════════════
// Meta de Indisp. %: DEFAULT_META_INDISPONIBILIDADE
// (lib/gestor/config-tabela-tempo-indisp/types.ts) — fonte única.

/**
 * Detalhamento de pausas — mantido no formato histórico (16 campos) por
 * compatibilidade com IndisponibilidadePausasTable. A tabela nova
 * (d1_indisponibilidade) NÃO tem coluna própria para pausa15, pausa40 e
 * pausaSemMotivo (existiam no Sheets antigo, sem equivalente no schema
 * atual) — ficam sempre "00:00:00" até o schema ganhar essas colunas, se
 * algum dia for preciso. `operacional` vem de pausa_operacional (coluna
 * criada em 2026-10-08; uploads anteriores ficam null → "00:00:00").
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

/**
 * Pausas de quem não tem linha em d1_indisponibilidade hoje — fonte única,
 * usada pela leitura do servidor (get-gestor-indisponibilidade.ts) e pelo
 * merge da UI (merge-tempo-indisp.ts).
 */
export const PAUSAS_ZERADAS: PausasDetalhe = {
  pausa10: "00:00:00",
  pausa20: "00:00:00",
  pausaParticular: "00:00:00",
  monOuTaref: "00:00:00",
  trenOuReun: "00:00:00",
  feedback: "00:00:00",
  prePausa: "00:00:00",
  ativo: "00:00:00",
  takeBlip: "00:00:00",
  pausa15: "00:00:00",
  pausa40: "00:00:00",
  operacional: "00:00:00",
  email: "00:00:00",
  indisponivel: "00:00:00",
  sistema: "00:00:00",
  pausaSemMotivo: "00:00:00",
};

export type GestorIndispLinha = {
  email: string;
  /** Indisp. % do upload. O veredito da meta é da tela (mergeOperadoresTempoIndisp). */
  indisponibilidade: number | null;
  nr17Pct: number | null;
  pausaParticularPct: number | null;
  /**
   * % de todas as pausas que não são NR17 (pausa10+pausa20) nem Particular
   * — treinamento, feedback, pré-pausa, ativo, take blip, email,
   * indisponível, sistema, monitoramento/tarefa e operacional — sobre o tempo logado.
   * Usada pela coluna "Outras Pausas" da tabela unificada; o detalhamento
   * por pausa individual (Monitoramento, Feedback etc.) continua em
   * `pausas` abaixo.
   */
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

/** Hora/nome do report ficam em GestorTempoLogadoData (mesmo upload, mesmos valores). */
export type GestorIndispData = {
  operadores: GestorIndispLinha[];
  /** Falha de banco (roster, d1_indisponibilidade ou d1_tempo_logado) — a página mostra erro, não "sem dados". */
  erro: boolean;
  /**
   * As duas leituras pegaram lotes diferentes (upload ou "Limpar Base"
   * confirmado entre o SELECT de d1_tempo_logado e o de d1_indisponibilidade).
   * Vem junto com `erro: true`; a action de refetch lê de novo.
   */
  loteDivergente?: boolean;
};
