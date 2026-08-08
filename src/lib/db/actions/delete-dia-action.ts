"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export type DeleteDiaResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteDiaAction(
  dataRef: string,
): Promise<DeleteDiaResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system")) {
    return { success: false, error: "Sem permissão" };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("db_pausas_diario")
    .delete()
    .eq("data_ref", dataRef);

  if (error) {
    console.error("[delete-dia] erro:", error.message);
    return { success: false, error: "Erro ao apagar o dia" };
  }

  revalidatePath("/config/db");
  return { success: true };
}
