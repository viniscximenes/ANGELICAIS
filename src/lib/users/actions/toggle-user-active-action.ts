"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

type ToggleActiveInput = {
  id: string;
  newIsActive: boolean;
};

type ToggleActiveResult =
  | { success: true }
  | { success: false; error: string };

export async function toggleUserActiveAction(
  input: ToggleActiveInput,
): Promise<ToggleActiveResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system", user.profile.isAdminSkill)) {
    return { success: false, error: "Sem permissão" };
  }

  if (input.id === user.profile.id) {
    return { success: false, error: "Você não pode desativar a si próprio" };
  }

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Erro de configuração",
    };
  }

  const { data: target } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", input.id)
    .maybeSingle();

  if (target?.role === "GESTOR") {
    return {
      success: false,
      error: "Não é possível desativar a gestora pelo painel",
    };
  }

  const { error } = await adminClient
    .from("profiles")
    .update({
      is_active: input.newIsActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);

  if (error) {
    console.error("[toggle-active] erro:", error);
    return { success: false, error: "Erro ao atualizar status" };
  }

  revalidatePath("/configuracoes/usuarios");
  return { success: true };
}
