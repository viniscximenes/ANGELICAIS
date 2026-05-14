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

  const { error, count } = await supabase
    .from("kpi_monthly_snapshots")
    .delete({ count: "exact" })
    .eq("mes_ref", mesRef);

  if (error) {
    console.error("[delete-month] erro:", error);
    return { success: false, error: "Falha ao apagar no banco" };
  }

  revalidatePath("/bases/kpi");
  revalidatePath("/kpi/atual-principal");
  revalidatePath("/kpi/atual-secundario");

  return { success: true, rowsDeleted: count ?? 0 };
}
