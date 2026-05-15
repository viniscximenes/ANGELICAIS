"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export type RemoveResult =
  | { success: true }
  | { success: false; error: string };

export async function removeDeflatorApplicationAction(
  applicationId: string,
): Promise<RemoveResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system")) {
    return { success: false, error: "Sem permissão" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("rv_deflator_applications")
    .delete()
    .eq("id", applicationId);

  if (error) {
    console.error("[remove-deflator] erro:", error);
    return { success: false, error: "Erro ao apagar" };
  }

  revalidatePath("/config/rv");
  revalidatePath("/rv/atual");
  revalidatePath("/rv/passado");
  return { success: true };
}
