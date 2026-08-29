"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getGestorIndisponibilidade } from "../get-gestor-indisponibilidade";
import type { GestorIndispLinha } from "../types";

type RefreshIndisponibilidadeResult =
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

  const data = await getGestorIndisponibilidade(user.profile.id);
  if (data.operadores.length === 0) return { success: false };

  return {
    success: true,
    operadores: data.operadores,
    horaReport: data.horaReport ?? "—",
    nomeSupervisorReport: data.nomeSupervisorReport ?? null,
  };
}
