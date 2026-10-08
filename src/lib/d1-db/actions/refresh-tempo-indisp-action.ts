"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getPausasProgramadasOuErro } from "@/lib/bases/pausas-programadas/actions/get-pausas-programadas";
import type { PausaProgramadaDb } from "@/lib/bases/pausas-programadas/types";
import { getConfigAderencia } from "@/lib/gestor/config-aderencia/get-config-aderencia";
import { getGestorIndisponibilidade } from "../get-gestor-indisponibilidade";
import { getGestorTempoLogado, lerTempoLogadoHojeEquipe } from "../get-gestor-tempo-logado";
import type { GestorIndispLinha, GestorTempoLogadoLinha } from "../types";

type RefreshTempoIndispResult =
  | {
      success: true;
      operadoresTempoLogado: GestorTempoLogadoLinha[];
      operadoresIndisponibilidade: GestorIndispLinha[];
      horaReport: string;
      nomeSupervisorReport: string | null;
      /** Dias (YYYY-MM-DD) da base do último upload — d1_tempo_logado.report_datas_base. */
      datasBaseReport: string[] | null;
      /**
       * base_pausas_programadas + tolerância de aderência — recarregadas no
       * mesmo refetch, pra Aderência, Pausas não realizadas e o dialog do
       * operador não ficarem presos no valor do primeiro carregamento.
       */
      pausasProgramadas: PausaProgramadaDb[];
      toleranciaMin: number;
    }
  | { success: false };

/**
 * Refetch da página inteira (tabela unificada + Analítico) numa action só —
 * usado pelo refetch manual de TempoIndispSection (após "Limpar Base";
 * esta página não tem polling). Antes eram duas actions em
 * paralelo (tempo logado e indisponibilidade), cada uma numa requisição
 * própria: autenticação, roster e d1_tempo_logado eram lidos duas vezes.
 *
 * Aqui cada leitura acontece UMA vez e é repassada: o cache() do React não
 * deduplica dentro de Server Action, então não dá pra contar com ele.
 *
 * Qualquer falha (inclusive erro de banco) devolve success:false e a tela
 * mantém o que já mostrava, com aviso — sem aplicar metade dos dados.
 *
 * Sem parâmetros: o veredito da meta de Indisp. é calculado na tela
 * (mergeOperadoresTempoIndisp), então a action não recebe nada do client.
 */
export async function refreshTempoIndispAction(): Promise<RefreshTempoIndispResult> {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "GESTOR") return { success: false };

  const gestorId = user.profile.id;

  // Config de aderência em paralelo com a 1ª leitura do lote (é config do
  // gestor, não entra na conferência de lote). .catch: a promise só é
  // aguardada depois do loop, que pode sair antes por erro — sem ele, uma
  // rejeição ficaria sem tratamento.
  const configAderenciaP = getConfigAderencia(gestorId).catch(() => null);

  // Roster + d1_tempo_logado de hoje: uma leitura, repassada às duas bases.
  // Se as leituras pegarem lotes diferentes (upload/"Limpar Base" confirmado
  // no meio — ver conferência em getGestorIndisponibilidade), lê tudo de
  // novo: até TENTATIVAS_LOTE vezes, depois desiste com success:false.
  // Leitura NÃO memoizada (lerTempoLogadoHojeEquipe): cada tentativa vai ao
  // banco de verdade.
  const TENTATIVAS_LOTE = 3;
  let pausasProgramadas: PausaProgramadaDb[] = [];
  let dataTempoLogado: Awaited<ReturnType<typeof getGestorTempoLogado>> | null = null;
  let dataIndisponibilidade: Awaited<ReturnType<typeof getGestorIndisponibilidade>> | null = null;
  for (let tentativa = 1; tentativa <= TENTATIVAS_LOTE; tentativa++) {
    const tempoLogadoHoje = await lerTempoLogadoHojeEquipe(gestorId);
    if (tempoLogadoHoje.erro || tempoLogadoHoje.roster.length === 0) return { success: false };

    try {
      [dataTempoLogado, dataIndisponibilidade, pausasProgramadas] = await Promise.all([
        getGestorTempoLogado(gestorId, tempoLogadoHoje),
        getGestorIndisponibilidade(gestorId, tempoLogadoHoje),
        getPausasProgramadasOuErro(tempoLogadoHoje.roster, user),
      ]);
    } catch {
      // Só getPausasProgramadasOuErro lança (erro de banco, já logado lá).
      return { success: false };
    }

    if (!dataIndisponibilidade.loteDivergente) break;
  }

  if (!dataTempoLogado || !dataIndisponibilidade || dataTempoLogado.erro || dataIndisponibilidade.erro) {
    return { success: false };
  }

  const configAderencia = await configAderenciaP;
  if (!configAderencia || configAderencia.erro) return { success: false };

  return {
    success: true,
    operadoresTempoLogado: dataTempoLogado.operadores,
    operadoresIndisponibilidade: dataIndisponibilidade.operadores,
    horaReport: dataTempoLogado.horaReport ?? "—",
    nomeSupervisorReport: dataTempoLogado.nomeSupervisorReport ?? null,
    datasBaseReport: dataTempoLogado.reportDatasBase ?? null,
    pausasProgramadas,
    toleranciaMin: configAderencia.toleranciaMin,
  };
}
