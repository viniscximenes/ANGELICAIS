"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export type DeleteMonthResult =
  | { success: true; rowsDeleted: number }
  | { success: false; error: string };

/**
 * Apaga todas as linhas de um mês específico do kpi_monthly_snapshots.
 * Apenas ADM/AUX (manage_base).
 */
export async function deleteMonthAction(
  mesRef: string,
): Promise<DeleteMonthResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  if (!can(user.profile.role, "manage_base")) {
    return { success: false, error: "Sem permissão para apagar dados" };
  }

  if (!mesRef.match(/^\d{4}-\d{2}-01$/)) {
    return { success: false, error: "Mês de referência inválido" };
  }

  const supabase = await createClient();

  const { error: errorOperadores, count: countOperadores } = await supabase
    .from("kpi_monthly_snapshots")
    .delete({ count: "exact" })
    .eq("mes_ref", mesRef);

  if (errorOperadores) {
    console.error("[delete-month] erro operadores:", errorOperadores);
    return { success: false, error: "Falha ao apagar dados de operadores" };
  }

  const { error: errorGestores, count: countGestores } = await supabase
    .from("kpi_gestor_snapshots")
    .delete({ count: "exact" })
    .eq("mes_ref", mesRef);

  if (errorGestores) {
    console.error("[delete-month] erro gestores:", errorGestores);
    return { success: false, error: "Falha ao apagar dados de gestores" };
  }

  revalidatePath("/bases/kpi");
  revalidatePath("/kpi/atual-principal");
  revalidatePath("/kpi/atual-secundario");

  return { success: true, rowsDeleted: (countOperadores ?? 0) + (countGestores ?? 0) };
}
