/**
 * Núcleo de cálculo da aderência de pausas — funções puras, sem banco e sem
 * dependência de path alias, para poderem ser exercitadas isoladamente.
 *
 * O acesso a dados (roster, db_pausas_diario, config, nome fantasia) fica em
 * get-aderencia.ts, que só orquestra e chama o que está aqui.
 */
import { formatSegundosParaHora } from "./parse";
import { contaComoIndisponivel, normalizarReasonCode } from "./reason-codes-indisp";
import { META_INDISPONIBILIDADE, META_TEMPO_LOGADO_SEGUNDOS } from "./types";

/** Antes disso é turno da manhã; a partir daí, turno da tarde. */
export const CORTE_TURNO_MINUTOS = 12 * 60;

/** Percentual a partir do qual a aderência do operador é considerada boa. */
export const LIMIAR_ADERENCIA_OK = 75;

export type TipoPausaAderencia = "P10" | "P20";

export type PausaAderencia = {
  tipo: TipoPausaAderencia;
  /** 1ª ou 2ª ocorrência daquele tipo no dia. */
  ordem: number;
  horaReal: string | null; // "HH:MM"
  horaEsperada: string; // "HH:MM"
  dentroTolerancia: boolean;
  /** Minutos de desvio (real − esperada). Negativo = adiantou. null = não houve. */
  desvioMin: number | null;
  duracaoSeg: number;
};

/** Um evento cru do dia — alimenta a timeline e o detalhamento do popup. */
export type EventoPausa = {
  reasonCode: string;
  hora: string | null; // "HH:MM"
  duracaoSeg: number;
  /** Se esse reason code entra na conta de indisponibilidade. */
  contaIndisp: boolean;
};

export type AderenciaOperador = {
  /** Email canônico do roster — chave estável. */
  email: string;
  /** Nome fantasia quando ativo, senão o nome derivado do email. */
  nome: string;
  horaLogin: string | null; // "HH:MM"
  turno: "manha" | "tarde" | null;
  metaLogin: string; // "HH:MM"
  aderenciaLogin: boolean;
  desvioLoginMin: number | null;
  pausas: PausaAderencia[];
  /** 0–100. Inclui o login no numerador e no denominador. */
  aderenciaPausasPercent: number;
  itensOk: number;
  itensAvaliados: number;
  tempoLogado: string; // "HH:MM:SS"
  tempoLogadoSeg: number;
  cumpriuMetaTempoLogado: boolean;
  indispPercent: number | null;
  cumpriuMetaIndisp: boolean;
  tempoIndisponivelSeg: number;
  /** Todos os eventos do dia, em ordem cronológica. */
  eventos: EventoPausa[];
  /** false quando o operador não tem nenhuma linha no dia. */
  temDados: boolean;
};

export type ResumoAderencia = {
  totalOperadores: number;
  comDados: number;
  tempoLogadoMedioSeg: number;
  indispMediaPercent: number | null;
  acimaMetaTempoLogado: number;
  dentroMetaIndisp: number;
  aderenciaMediaPercent: number | null;
};

/** Só o que o cálculo precisa de uma linha de db_pausas_diario. */
export type LinhaPausa = {
  agent_user: string;
  agent_name: string | null;
  state: string;
  reason_code: string | null;
  login_time_seg: number | null;
  agent_state_time_seg: number | null;
  hora_inicio: string | null;
};

/** Horários esperados, já resolvidos (evita depender do módulo de config). */
export type MetasAderencia = {
  metaLoginManha: string;
  metaLoginTarde: string;
  metaP10Primeira: string;
  metaP20: string;
  metaP10Segunda: string;
  toleranciaMin: number;
};

/** "HH:MM(:SS)" -> minutos desde a meia-noite. Inválido -> null. */
export function horaParaMinutos(hora: string | null | undefined): number | null {
  if (!hora) return null;
  const m = hora.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** "HH:MM:SS" -> "HH:MM" (o segundo não importa pra aderência). */
export function paraHoraCurta(hora: string | null | undefined): string | null {
  if (!hora) return null;
  const m = hora.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

/** Linhas de um reason code específico, em ordem cronológica. */
export function ocorrenciasDe(linhas: LinhaPausa[], reason: string): LinhaPausa[] {
  return linhas
    .filter((l) => normalizarReasonCode(l.reason_code) === reason)
    .sort((a, b) => {
      // Sem horário não dá pra ordenar — essas vão para o fim, para não
      // roubarem a posição de "1ª ocorrência" de uma pausa datada.
      if (!a.hora_inicio && !b.hora_inicio) return 0;
      if (!a.hora_inicio) return 1;
      if (!b.hora_inicio) return -1;
      return a.hora_inicio.localeCompare(b.hora_inicio);
    });
}

export function montarPausa(
  tipo: TipoPausaAderencia,
  ordem: number,
  linha: LinhaPausa | undefined,
  horaEsperada: string,
  toleranciaMin: number,
): PausaAderencia {
  const horaReal = paraHoraCurta(linha?.hora_inicio ?? null);
  const realMin = horaParaMinutos(horaReal);
  const esperadaMin = horaParaMinutos(horaEsperada);

  const desvioMin = realMin !== null && esperadaMin !== null ? realMin - esperadaMin : null;

  return {
    tipo,
    ordem,
    horaReal,
    horaEsperada,
    dentroTolerancia: desvioMin !== null && Math.abs(desvioMin) <= toleranciaMin,
    desvioMin,
    duracaoSeg: linha?.agent_state_time_seg ?? 0,
  };
}

function ordenarPorHora(a: { hora: string | null }, b: { hora: string | null }): number {
  if (!a.hora && !b.hora) return 0;
  if (!a.hora) return 1;
  if (!b.hora) return -1;
  return a.hora.localeCompare(b.hora);
}

/**
 * Aderência de um operador num dia, a partir das linhas dele em
 * db_pausas_diario.
 *
 * Tempo logado e indisponibilidade são recalculados aqui com as MESMAS
 * definições de uploadTempoLogadoAction:
 *   tempo logado       = soma de LOGIN TIME das linhas "Login"
 *   tempo indisponível = soma de AGENT STATE TIME dos reason codes mapeados
 *   indisponibilidade% = indisponível ÷ logado
 */
export function calcularAderenciaOperador(
  email: string,
  nome: string,
  linhas: LinhaPausa[],
  metas: MetasAderencia,
): AderenciaOperador {
  let tempoLogadoSeg = 0;
  let tempoIndisponivelSeg = 0;
  const horasLogin: string[] = [];

  for (const l of linhas) {
    if (l.state.trim().toLowerCase() === "login") {
      tempoLogadoSeg += l.login_time_seg ?? 0;
      if (l.hora_inicio) horasLogin.push(l.hora_inicio);
    }
    if (contaComoIndisponivel(l.reason_code)) {
      tempoIndisponivelSeg += l.agent_state_time_seg ?? 0;
    }
  }

  const indispPercent =
    tempoLogadoSeg > 0
      ? Math.round((tempoIndisponivelSeg / tempoLogadoSeg) * 100 * 100) / 100
      : null;

  // ── Login: o mais cedo do dia ─────────────────────────────────
  horasLogin.sort();
  const horaLogin = paraHoraCurta(horasLogin[0] ?? null);
  const loginMin = horaParaMinutos(horaLogin);

  // Não existe campo de turno no cadastro — ele é inferido do próprio login
  // (antes do meio-dia = manhã). Um operador da manhã que logue só à tarde é
  // classificado como tarde e comparado à meta errada; sem escala cadastrada
  // não há como distinguir "entrou muito atrasado" de "é do turno da tarde".
  const turno: "manha" | "tarde" | null =
    loginMin === null ? null : loginMin < CORTE_TURNO_MINUTOS ? "manha" : "tarde";

  const metaLogin = turno === "tarde" ? metas.metaLoginTarde : metas.metaLoginManha;
  const metaLoginMin = horaParaMinutos(metaLogin);

  const desvioLoginMin =
    loginMin !== null && metaLoginMin !== null ? loginMin - metaLoginMin : null;
  const aderenciaLogin =
    desvioLoginMin !== null && Math.abs(desvioLoginMin) <= metas.toleranciaMin;

  // ── Pausas do dia, em ordem cronológica ───────────────────────
  const eventos: EventoPausa[] = linhas
    .filter((l) => l.state.trim().toLowerCase() !== "login")
    .map((l) => ({
      reasonCode: l.reason_code ?? "Sem motivo",
      hora: paraHoraCurta(l.hora_inicio),
      duracaoSeg: l.agent_state_time_seg ?? 0,
      contaIndisp: contaComoIndisponivel(l.reason_code),
    }))
    .sort(ordenarPorHora);

  const p10 = ocorrenciasDe(linhas, "pausa 10");
  const p20 = ocorrenciasDe(linhas, "pausa 20");

  const pausas: PausaAderencia[] = [
    montarPausa("P10", 1, p10[0], metas.metaP10Primeira, metas.toleranciaMin),
    montarPausa("P20", 1, p20[0], metas.metaP20, metas.toleranciaMin),
    montarPausa("P10", 2, p10[1], metas.metaP10Segunda, metas.toleranciaMin),
  ];

  // Aderência = (login + pausas dentro da tolerância) ÷ 4 esperados × 100.
  // Uma pausa não tirada conta como não aderente — por isso o denominador é
  // fixo em 4, e não "o que existiu".
  const itensAvaliados = 1 + pausas.length;
  const itensOk = (aderenciaLogin ? 1 : 0) + pausas.filter((p) => p.dentroTolerancia).length;

  return {
    email,
    nome,
    horaLogin,
    turno,
    metaLogin,
    aderenciaLogin,
    desvioLoginMin,
    pausas,
    aderenciaPausasPercent: Math.round((itensOk / itensAvaliados) * 100),
    itensOk,
    itensAvaliados,
    tempoLogado: formatSegundosParaHora(tempoLogadoSeg),
    tempoLogadoSeg,
    cumpriuMetaTempoLogado: tempoLogadoSeg >= META_TEMPO_LOGADO_SEGUNDOS,
    indispPercent,
    cumpriuMetaIndisp: indispPercent !== null && indispPercent < META_INDISPONIBILIDADE,
    tempoIndisponivelSeg,
    eventos,
    temDados: linhas.length > 0,
  };
}

/** Quem tem dados primeiro, do mais aderente ao menos; sem dados no fim. */
export function ordenarOperadores(operadores: AderenciaOperador[]): AderenciaOperador[] {
  return [...operadores].sort((a, b) => {
    if (a.temDados !== b.temDados) return a.temDados ? -1 : 1;
    if (b.aderenciaPausasPercent !== a.aderenciaPausasPercent) {
      return b.aderenciaPausasPercent - a.aderenciaPausasPercent;
    }
    return a.nome.localeCompare(b.nome, "pt-BR");
  });
}

export function montarResumo(operadores: AderenciaOperador[]): ResumoAderencia {
  const comDados = operadores.filter((o) => o.temDados);

  const somaTempo = comDados.reduce((acc, o) => acc + o.tempoLogadoSeg, 0);
  const comIndisp = comDados.filter((o) => o.indispPercent !== null);
  const somaIndisp = comIndisp.reduce((acc, o) => acc + (o.indispPercent ?? 0), 0);
  const somaAderencia = comDados.reduce((acc, o) => acc + o.aderenciaPausasPercent, 0);

  return {
    totalOperadores: operadores.length,
    comDados: comDados.length,
    tempoLogadoMedioSeg: comDados.length > 0 ? Math.round(somaTempo / comDados.length) : 0,
    indispMediaPercent:
      comIndisp.length > 0 ? Math.round((somaIndisp / comIndisp.length) * 100) / 100 : null,
    acimaMetaTempoLogado: comDados.filter((o) => o.cumpriuMetaTempoLogado).length,
    dentroMetaIndisp: comDados.filter((o) => o.cumpriuMetaIndisp).length,
    aderenciaMediaPercent:
      comDados.length > 0 ? Math.round(somaAderencia / comDados.length) : null,
  };
}
