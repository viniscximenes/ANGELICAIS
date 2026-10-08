import { cache } from "react";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveNomeSupervisorReportExibicao } from "@/lib/gestor/resolve-nome-supervisor-report";
import { getEmailPrefix, getEmailVariants } from "@/lib/utils/email-variants";
import { getRosterOperadoresGestorOuErro } from "./get-roster-gestor";
import { dataRefHojeBR, horaParaSegundos } from "./parse";
import {
  META_TEMPO_LOGADO_SEGUNDOS,
  type GestorTempoLogadoData,
  type GestorTempoLogadoLinha,
  type StatusPresenca,
} from "./types";

function statusDe(horaLogin: string | null, horaLogout: string | null): StatusPresenca {
  if (!horaLogin) return "ausente";
  if (!horaLogout) return "ainda_logado";
  return "completo";
}

/**
 * Linhas de HOJE de d1_tempo_logado da equipe do gestor — UMA leitura por
 * requisição: a página chama getGestorTempoLogado e getGestorIndisponibilidade
 * em paralelo e as duas precisam desta tabela (a indisponibilidade usa o
 * tempo logado como denominador dos %). cache() do React, mesmo padrão de
 * get-roster-gestor.ts; fora de uma requisição do React, chama direto.
 *
 * Admin de propósito: d1_tempo_logado tem RLS ligado e NENHUMA policy no
 * Supabase (migration fecha_select_aberto_d1_tempo_logado_indisp,
 * scripts/sql/fecha-select-tempo-logado-indisp.sql) — o cliente do usuário
 * não lê nada. O escopo por equipe é o roster.
 *
 * `erro`: falha ao ler o roster ou d1_tempo_logado. Usa a variante que
 * LANÇA do roster (getRosterOperadoresGestorOuErro): a outra devolve [] no
 * erro e a página mostrava "Ainda não há dados da equipe" (ou todo mundo
 * "ausente") quando o banco é que tinha falhado. Mesma ideia do `erro` de
 * getGestorConsolidado.
 */
export async function lerTempoLogadoHojeEquipe(gestorId: string) {
  let roster: string[];
  try {
    roster = await getRosterOperadoresGestorOuErro(gestorId);
  } catch {
    // Detalhe já logado em get-roster-gestor.ts.
    return { roster: [], rows: [], erro: true };
  }
  if (roster.length === 0) return { roster, rows: [], erro: false };

  // Filtra por operator_email (via roster), NÃO por gestor_id — mesmo motivo
  // de get-gestor-consolidado.ts.
  const { data, error } = await createAdminClient()
    .from("d1_tempo_logado")
    .select(
      "operator_email, tempo_logado, hora_login, hora_logout, report_hora, report_nome_supervisor, report_datas_base",
    )
    .in("operator_email", roster.flatMap(getEmailVariants))
    .eq("data_ref", dataRefHojeBR());

  if (error) {
    console.error("[get-gestor-tempo-logado] erro ao buscar d1_tempo_logado:", error.message);
    return { roster, rows: [], erro: true };
  }

  return { roster, rows: data ?? [], erro: false };
}

/**
 * Versão memoizada por requisição de lerTempoLogadoHojeEquipe (página). A
 * action de refetch usa a não memoizada quando precisa ler de novo (ver
 * conferência de lote em getGestorIndisponibilidade).
 */
export const getTempoLogadoHojeEquipe = cache(lerTempoLogadoHojeEquipe);

/** Resultado de getTempoLogadoHojeEquipe — roster + linhas de hoje + erro. */
export type TempoLogadoHojeEquipe = Awaited<ReturnType<typeof getTempoLogadoHojeEquipe>>;

/**
 * Lê o Tempo Logado da equipe de um gestor (d1_tempo_logado, data de
 * hoje). Substitui fetchGestorTempoLogado (Sheets) — mesmo shape de
 * retorno (GestorTempoLogadoData).
 *
 * A lista de operadores vem SEMPRE do roster (d1_operadores_gestor) — um
 * operador cadastrado mas sem upload de hoje aparece como "ausente" (zero
 * segundos, sem login). Só retorna `operadores: []` quando o roster está
 * vazio (equipe sem ninguém cadastrado) ou numa falha de banco (aí com
 * `erro: true`).
 */
export async function getGestorTempoLogado(
  gestorId: string,
  /**
   * Leitura já feita por quem chama (refreshTempoIndispAction) — o cache()
   * do React não deduplica dentro de Server Action, então a action lê uma
   * vez e repassa. Omitido (página), usa a leitura memoizada da requisição.
   */
  tempoLogadoHoje?: TempoLogadoHojeEquipe,
): Promise<GestorTempoLogadoData> {
  const { roster, rows, erro } = tempoLogadoHoje ?? (await getTempoLogadoHojeEquipe(gestorId));
  if (erro) return { operadores: [], erro: true };
  if (roster.length === 0) return { operadores: [], erro: false };

  // Chave por PREFIXO — mesma pessoa pode vir @alloha.com ou
  // @sumicity.net.br no CSV; o roster só guarda @alloha.com.
  const rowPorPrefixo = new Map(rows.map((row) => [getEmailPrefix(row.operator_email), row]));

  const operadores: GestorTempoLogadoLinha[] = roster.map((email) => {
    const row = rowPorPrefixo.get(getEmailPrefix(email));
    if (!row) {
      return {
        email,
        tempoLogado: "00:00:00",
        tempoLogadoSegundos: 0,
        cumpriuMeta: false,
        horaLogin: null,
        horaLogout: null,
        status: statusDe(null, null),
      };
    }
    const tempoLogadoSegundos = horaParaSegundos(row.tempo_logado);
    return {
      // Email canônico do roster — mantém a identidade estável entre
      // uploads mesmo se o CSV variar de domínio.
      email,
      tempoLogado: row.tempo_logado ?? "00:00:00",
      tempoLogadoSegundos,
      cumpriuMeta: tempoLogadoSegundos >= META_TEMPO_LOGADO_SEGUNDOS,
      horaLogin: row.hora_login,
      horaLogout: row.hora_logout,
      status: statusDe(row.hora_login, row.hora_logout),
    };
  });

  const rowComHora = rows.find(
    (r) => r.report_hora && r.report_hora !== "00:00:00" && r.report_hora !== "00:00",
  );

  const nomeSupervisorReportBruto =
    rowComHora?.report_nome_supervisor ?? rows[0]?.report_nome_supervisor ?? null;

  return {
    operadores,
    erro: false,
    horaReport: rowComHora?.report_hora ?? rows[0]?.report_hora ?? undefined,
    // Dias da base do último upload (coluna DATE) — iguais em todas as linhas.
    reportDatasBase: rowComHora?.report_datas_base ?? rows[0]?.report_datas_base ?? null,
    // Só formatação de exibição ("GABRIEL HENRIQUE XIMENES DA SILVA" →
    // "Gabriel Ximenes") — ver resolveNomeSupervisorReportExibicao.
    nomeSupervisorReport: await resolveNomeSupervisorReportExibicao(
      createAdminClient(),
      nomeSupervisorReportBruto,
    ),
  };
}
