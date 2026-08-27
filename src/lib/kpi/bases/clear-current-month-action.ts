"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

import { getCurrentMonthRef } from "./format-date";

export type ClearCurrentMonthResult =
  | { success: true; rowsDeleted: number }
  | { success: false; error: string };

/**
 * Apaga todos os dados de KPI do mês ATUAL (operadores + supervisores) —
 * kpi_monthly_snapshots e kpi_gestor_snapshots. Sempre calcula o mês
 * corrente internamente (não recebe mes_ref por parâmetro), pra não dar pra
 * apagar um mês fechado por essa action — isso já existe via
 * deleteMonthAction, que exclui justamente o mês atual da própria UI.
 */
export async function clearCurrentMonthAction(): Promise<ClearCurrentMonthResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  if (!can(user.profile.role, "manage_base", user.profile.isAdminSkill)) {
    return { success: false, error: "Sem permissão para apagar dados" };
  }

  const mesRef = getCurrentMonthRef();
  const supabase = await createClient();

  const { error: errorOperadores, count: countOperadores } = await supabase
    .from("kpi_monthly_snapshots")
    .delete({ count: "exact" })
    .eq("mes_ref", mesRef);

  if (errorOperadores) {
    console.error(
      "[clear-current-month] erro ao apagar kpi_monthly_snapshots:",
      errorOperadores,
    );
    return { success: false, error: "Falha ao apagar dados de operadores" };
  }

  const { error: errorGestores, count: countGestores } = await supabase
    .from("kpi_gestor_snapshots")
    .delete({ count: "exact" })
    .eq("mes_ref", mesRef);

  if (errorGestores) {
    console.error(
      "[clear-current-month] erro ao apagar kpi_gestor_snapshots:",
      errorGestores,
    );
    return { success: false, error: "Falha ao apagar dados de supervisores" };
  }

  revalidatePath("/bases/kpi");
  revalidatePath("/kpi/atual-principal");
  revalidatePath("/kpi/atual-secundario");

  return {
    success: true,
    rowsDeleted: (countOperadores ?? 0) + (countGestores ?? 0),
  };
}
