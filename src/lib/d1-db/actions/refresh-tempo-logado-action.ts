"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getGestorTempoLogado } from "../get-gestor-tempo-logado";
import type { GestorTempoLogadoLinha } from "../types";

type RefreshTempoLogadoResult =
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

  const data = await getGestorTempoLogado(user.profile.id);
  if (data.operadores.length === 0) return { success: false };

  return {
    success: true,
    operadores: data.operadores,
    horaReport: data.horaReport ?? "—",
    nomeSupervisorReport: data.nomeSupervisorReport ?? null,
  };
}
