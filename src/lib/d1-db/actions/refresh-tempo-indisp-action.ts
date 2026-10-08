"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getPausasProgramadasOuErro } from "@/lib/bases/pausas-programadas/actions/get-pausas-programadas";
import type { PausaProgramadaDb } from "@/lib/bases/pausas-programadas/types";
import { getConfigAderencia } from "@/lib/gestor/config-aderencia/get-config-aderencia";
import { getGestorIndisponibilidade } from "../get-gestor-indisponibilidade";
import { getGestorTempoLogado, getTempoLogadoHojeEquipe } from "../get-gestor-tempo-logado";
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
 * usado pelo refetch manual de TempoIndispSection (após "Limpar Base" e
 * salvar a config; esta página não tem polling). Antes eram duas actions em
 * paralelo (tempo logado e indisponibilidade), cada uma numa requisição
 * própria: autenticação, roster e d1_tempo_logado eram lidos duas vezes.
 *
 * Aqui cada leitura acontece UMA vez e é repassada: o cache() do React não
 * deduplica dentro de Server Action, então não dá pra contar com ele.
 *
 * Qualquer falha (inclusive erro de banco) devolve success:false e a tela
 * mantém o que já mostrava, com aviso — sem aplicar metade dos dados.
 *
 * @param metaIndisponibilidade Meta ATUAL do gestor (estado do client, não
 * relida do banco aqui) — precisa ser repassada a cada refetch, senão o
 * recálculo de `cumpriuMeta` ignoraria a meta configurada e voltaria pro
 * default (ver comentário em getGestorIndisponibilidade). Validada aqui com
 * a mesma faixa de saveConfigTabelaTempoIndispAction (0 a 100).
 */
export async function refreshTempoIndispAction(
  metaIndisponibilidade?: number,
): Promise<RefreshTempoIndispResult> {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "GESTOR") return { success: false };

  // Server Action é endpoint público: o tipo do TS não chega em runtime.
  if (
    metaIndisponibilidade !== undefined &&
    (typeof metaIndisponibilidade !== "number" ||
      !Number.isFinite(metaIndisponibilidade) ||
      metaIndisponibilidade < 0 ||
      metaIndisponibilidade > 100)
  ) {
    return { success: false };
  }

  const gestorId = user.profile.id;

  // Roster + d1_tempo_logado de hoje: uma leitura, repassada às duas bases.
  const [tempoLogadoHoje, configAderencia] = await Promise.all([
    getTempoLogadoHojeEquipe(gestorId),
    getConfigAderencia(gestorId),
  ]);
  if (tempoLogadoHoje.erro || configAderencia.erro || tempoLogadoHoje.roster.length === 0) {
    return { success: false };
  }

  let pausasProgramadas: PausaProgramadaDb[];
  let dataTempoLogado: Awaited<ReturnType<typeof getGestorTempoLogado>>;
  let dataIndisponibilidade: Awaited<ReturnType<typeof getGestorIndisponibilidade>>;
  try {
    [dataTempoLogado, dataIndisponibilidade, pausasProgramadas] = await Promise.all([
      getGestorTempoLogado(gestorId, tempoLogadoHoje),
      getGestorIndisponibilidade(gestorId, metaIndisponibilidade, tempoLogadoHoje),
      getPausasProgramadasOuErro(tempoLogadoHoje.roster, user),
    ]);
  } catch {
    // Só getPausasProgramadasOuErro lança (erro de banco, já logado lá).
    return { success: false };
  }

  if (dataTempoLogado.erro || dataIndisponibilidade.erro) return { success: false };

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
