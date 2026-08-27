"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export type DeleteResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteMonitoriaAction(id: string): Promise<DeleteResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system", user.profile.isAdminSkill)) {
    return { success: false, error: "Sem permissão" };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("monitorias").delete().eq("id", id);

  if (error) {
    console.error("[delete-monitoria] erro:", error);
    return { success: false, error: "Erro ao apagar" };
  }

  revalidatePath("/registros/monitoria");
  return { success: true };
}
