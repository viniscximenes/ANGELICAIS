import { getNomeFantasiaConfig } from "@/lib/gestor/nome-fantasia/get-config";
import { resolverNomeExibicao } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import { getConfigAderencia } from "@/lib/gestor/config-aderencia/get-config-aderencia";
import { DEFAULT_CONFIG_ADERENCIA, type ConfigAderencia } from "@/lib/gestor/config-aderencia/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEmailPrefix } from "@/lib/utils/email-variants";

import {
  calcularAderenciaOperador,
  montarResumo,
  ordenarOperadores,
  type AderenciaOperador,
  type LinhaPausa,
  type ResumoAderencia,
} from "./aderencia-calc";
import { getRosterOperadoresGestor } from "./get-roster-gestor";

export type {
  AderenciaOperador,
  EventoPausa,
  PausaAderencia,
  TipoPausaAderencia,
} from "./aderencia-calc";

/** Limite de paginação do PostgREST. */
const PAGE_SIZE = 1000;

export type AderenciaData = {
  dataRef: string;
  operadores: AderenciaOperador[];
  config: ConfigAderencia;
  /**
   * false quando NENHUMA linha do dia tem hora_inicio — bases importadas
   * antes de o parser passar a salvar o horário. A tela usa isso pra explicar
   * por que as colunas de horário estão vazias, em vez de mostrar 0% de
   * aderência como se o time tivesse errado todas as pausas.
   */
  temHorario: boolean;
  resumo: ResumoAderencia;
};

const RESUMO_VAZIO: ResumoAderencia = {
  totalOperadores: 0,
  comDados: 0,
  tempoLogadoMedioSeg: 0,
  indispMediaPercent: null,
  acimaMetaTempoLogado: 0,
  dentroMetaIndisp: 0,
  aderenciaMediaPercent: null,
};

/** Estado vazio reaproveitado pela página quando não há dia nenhum na base. */
export function aderenciaVazia(dataRef = ""): AderenciaData {
  return {
    dataRef,
    operadores: [],
    config: DEFAULT_CONFIG_ADERENCIA,
    temHorario: false,
    resumo: RESUMO_VAZIO,
  };
}

/**
 * Dias com dados em db_pausas_diario, do mais recente para o mais antigo. A
 * aderência depende dessa base, então o seletor de dia da tela só pode
 * oferecer dias que existam aqui.
 *
 * Usa a mesma RPC do Diário de Bordo (db_pausas_dias_disponiveis, GROUP BY no
 * Postgres) — varrer a tabela pelo app custaria centenas de páginas de 1000
 * linhas só para descobrir ~30 datas distintas.
 */
export async function getDiasComPausas(): Promise<string[]> {
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("db_pausas_dias_disponiveis");

  if (error) {
    console.error("[getDiasComPausas] erro:", error.message);
    return [];
  }

  return ((data ?? []) as { data_ref: string }[])
    .map((row) => row.data_ref)
    .filter(Boolean)
    .sort((a, b) => (a < b ? 1 : -1));
}

/**
 * Aderência de pausas da equipe de um gestor, no dia informado.
 *
 * Tudo vem de db_pausas_diario — inclusive tempo logado e indisponibilidade,
 * que NÃO são lidos de d1_tempo_logado/d1_indisponibilidade. Essas duas
 * tabelas só guardam o dia corrente (são sobrescritas a cada upload e
 * esvaziadas pelo botão "Limpar base"), enquanto o seletor desta tela navega
 * ~30 dias de histórico. Como as três tabelas nascem do MESMO CSV, recalcular
 * aqui dá o mesmo número para qualquer dia — ver aderencia-calc.ts.
 */
export async function getAderencia(
  gestorId: string,
  dataRef: string,
): Promise<AderenciaData> {
  const admin = createAdminClient();

  const [roster, config, fantasiaConfig] = await Promise.all([
    getRosterOperadoresGestor(gestorId),
    getConfigAderencia(gestorId),
    getNomeFantasiaConfig(gestorId),
  ]);

  if (roster.length === 0) return { ...aderenciaVazia(dataRef), config };

  const nomeFantasia = {
    ativo: fantasiaConfig.ativo,
    mapa: Object.fromEntries(fantasiaConfig.mapa),
  };

  // db_pausas_diario guarda o prefixo do email (agent_user); o roster guarda
  // o email completo, sempre @alloha.com.
  const prefixos = roster.map(getEmailPrefix);

  let linhas: LinhaPausa[] = [];
  let page = 0;

  for (;;) {
    const { data, error } = await admin
      .from("db_pausas_diario")
      .select(
        "agent_user, agent_name, state, reason_code, login_time_seg, agent_state_time_seg, hora_inicio",
      )
      .eq("data_ref", dataRef)
      .in("agent_user", prefixos)
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (error) {
      console.error("[getAderencia] erro ao ler db_pausas_diario:", error.message);
      return { ...aderenciaVazia(dataRef), config };
    }

    const lote = (data ?? []) as LinhaPausa[];
    linhas = linhas.concat(lote);
    if (lote.length < PAGE_SIZE) break;
    page++;
  }

  const porPrefixo = new Map<string, LinhaPausa[]>();
  for (const linha of linhas) {
    const grupo = porPrefixo.get(linha.agent_user);
    if (grupo) grupo.push(linha);
    else porPrefixo.set(linha.agent_user, [linha]);
  }

  const operadores = roster.map((email) =>
    calcularAderenciaOperador(
      email,
      resolverNomeExibicao(email, nomeFantasia),
      porPrefixo.get(getEmailPrefix(email)) ?? [],
      config,
    ),
  );

  return {
    dataRef,
    operadores: ordenarOperadores(operadores),
    config,
    temHorario: linhas.some((l) => l.hora_inicio !== null),
    resumo: montarResumo(operadores),
  };
}
