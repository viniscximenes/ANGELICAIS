"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import {
  fetchGestorTempoLogado,
  resolveGuiaTempoLogado,
} from "@/lib/google/gestor";
import type { GestorTempoLogadoLinha } from "@/lib/google/gestor/tempo-logado-types";

export type RefreshTempoLogadoResult =
  | {
      success: true;
      operadores: GestorTempoLogadoLinha[];
      horaReport: string;
      nomeSupervisorReport: string | null;
    }
  | { success: false };

/**
 * Refetch leve da tabela Tempo Logado (operadores + hora/nome do report),
 * usado pelo polling de GestorTempoLogadoSection.
 */
export async function refreshTempoLogadoAction(): Promise<RefreshTempoLogadoResult> {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "GESTOR") return { success: false };

  const guia =
    resolveGuiaTempoLogado(user.profile.username) ??
    resolveGuiaTempoLogado(user.profile.emailCorporativo);
  if (!guia) return { success: false };

  const data = await fetchGestorTempoLogado(guia);
  if (data.operadores.length === 0) return { success: false };

  return {
    success: true,
    operadores: data.operadores,
    horaReport: data.horaReport ?? "—",
    nomeSupervisorReport: data.nomeSupervisorReport ?? null,
  };
}
