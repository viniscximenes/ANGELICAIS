"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import {
  fetchGestorIndisponibilidade,
  resolveGuiaTempoLogado,
} from "@/lib/google/gestor";
import type { GestorIndispLinha } from "@/lib/google/gestor/indisponibilidade-types";

export type RefreshIndisponibilidadeResult =
  | {
      success: true;
      operadores: GestorIndispLinha[];
      horaReport: string;
      nomeSupervisorReport: string | null;
    }
  | { success: false };

/**
 * Refetch leve da tabela Indisponibilidade (operadores + hora/nome do
 * report), usado pelo polling de GestorIndisponibilidadeSection.
 */
export async function refreshIndisponibilidadeAction(): Promise<RefreshIndisponibilidadeResult> {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "GESTOR") return { success: false };

  const guia =
    resolveGuiaTempoLogado(user.profile.username) ??
    resolveGuiaTempoLogado(user.profile.emailCorporativo);
  if (!guia) return { success: false };

  const data = await fetchGestorIndisponibilidade(guia);
  if (data.operadores.length === 0) return { success: false };

  return {
    success: true,
    operadores: data.operadores,
    horaReport: data.horaReport ?? "—",
    nomeSupervisorReport: data.nomeSupervisorReport ?? null,
  };
}
