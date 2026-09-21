"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getPausasProgramadas } from "@/lib/bases/pausas-programadas/actions/get-pausas-programadas";
import type { PausaProgramadaDb } from "@/lib/bases/pausas-programadas/types";
import { getConfigAderencia } from "@/lib/gestor/config-aderencia/get-config-aderencia";
import { getGestorIndisponibilidade } from "../get-gestor-indisponibilidade";
import { getRosterOperadoresGestor } from "../get-roster-gestor";
import type { GestorIndispLinha } from "../types";

type RefreshIndisponibilidadeResult =
  | {
      success: true;
      operadores: GestorIndispLinha[];
      horaReport: string;
      nomeSupervisorReport: string | null;
      /**
       * base_pausas_programadas + tolerância de aderência — antes só vinham
       * do SSR de page.tsx e nunca eram recarregados pelo polling de 30s
       * (buildForecastPorOperador/calcularAderenciaOperador ficavam presos
       * no valor do primeiro carregamento da página). Incluídos aqui, sem
       * criar nenhum polling novo — reaproveita o MESMO setInterval já
       * existente em tempo-indisp-section.tsx.
       */
      pausasProgramadas: PausaProgramadaDb[];
      toleranciaMin: number;
    }
  | { success: false };

/**
 * Refetch leve da tabela Indisponibilidade (operadores + hora/nome do
 * report + pausas programadas + tolerância de aderência), usado pelo
 * polling da tabela unificada E dos cards analíticos (Aderência, Pausas
 * não realizadas, Estouro de pausa).
 *
 * @param metaIndisponibilidade Meta ATUAL do gestor (estado do client, não
 * relida do banco aqui) — precisa ser repassada a cada poll, senão o
 * recálculo de `cumpriuMeta` a cada 30s ignoraria a meta configurada e
 * voltaria pro default (ver comentário em getGestorIndisponibilidade).
 */
export async function refreshIndisponibilidadeAction(
  metaIndisponibilidade?: number,
): Promise<RefreshIndisponibilidadeResult> {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "GESTOR") return { success: false };

  const [data, rosterD1, configAderencia] = await Promise.all([
    getGestorIndisponibilidade(user.profile.id, metaIndisponibilidade),
    getRosterOperadoresGestor(user.profile.id),
    getConfigAderencia(user.profile.id),
  ]);
  if (data.operadores.length === 0) return { success: false };

  const pausasProgramadas = await getPausasProgramadas(rosterD1);

  return {
    success: true,
    operadores: data.operadores,
    horaReport: data.horaReport ?? "—",
    nomeSupervisorReport: data.nomeSupervisorReport ?? null,
    pausasProgramadas,
    toleranciaMin: configAderencia.toleranciaMin,
  };
}
