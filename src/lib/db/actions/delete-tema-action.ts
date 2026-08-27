"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export type DeleteTemaResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteTemaAction(id: string): Promise<DeleteTemaResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system", user.profile.isAdminSkill)) {
    return { success: false, error: "Sem permissão" };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("db_temas").delete().eq("id", id);

  if (error) {
    console.error("[delete-tema] erro:", error.message);
    return { success: false, error: "Erro ao apagar tema" };
  }

  revalidatePath("/config/db");
  return { success: true };
}
