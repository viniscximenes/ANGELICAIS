"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export type TogglePlanoActiveResult =
  | { success: true }
  | { success: false; error: string };

export async function togglePlanoActiveAction(
  id: string,
  newIsActive: boolean,
): Promise<TogglePlanoActiveResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system", user.profile.isAdminSkill)) {
    return { success: false, error: "Sem permissão" };
  }

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Erro",
    };
  }

  const { error } = await adminClient
    .from("planos")
    .update({
      is_active: newIsActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[toggle-plano-active] erro:", error);
    return { success: false, error: "Erro ao atualizar status" };
  }

  revalidatePath("/config/planos");
  revalidatePath("/atendimento");
  return { success: true };
}
