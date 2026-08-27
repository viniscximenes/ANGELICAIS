"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export type DeleteDiarioResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteDiarioAction(
  id: string,
): Promise<DeleteDiarioResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system", user.profile.isAdminSkill)) {
    return { success: false, error: "Sem permissão" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("diario_registros")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[delete-diario] erro:", error);
    return { success: false, error: "Erro ao apagar" };
  }

  revalidatePath("/registros/diario");
  return { success: true };
}
