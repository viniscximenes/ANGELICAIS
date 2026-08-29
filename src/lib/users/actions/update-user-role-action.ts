"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

type UpdateRoleInput = {
  id: string;
  newRole: "ADM" | "GESTOR";
};

type UpdateRoleResult =
  | { success: true }
  | { success: false; error: string };

export async function updateUserRoleAction(
  input: UpdateRoleInput,
): Promise<UpdateRoleResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system", user.profile.isAdminSkill)) {
    return { success: false, error: "Sem permissão" };
  }

  if (input.id === user.profile.id) {
    return {
      success: false,
      error: "Você não pode alterar sua própria role",
    };
  }

  if (!["ADM", "GESTOR"].includes(input.newRole)) {
    return {
      success: false,
      error: "Role inválida (apenas ADM ou GESTOR são permitidos)",
    };
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

  if (!target) {
    return { success: false, error: "Usuário não encontrado" };
  }

  const { error } = await adminClient
    .from("profiles")
    .update({
      role: input.newRole,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);

  if (error) {
    console.error("[update-user-role] erro:", error);
    return { success: false, error: "Erro ao alterar role" };
  }

  revalidatePath("/configuracoes/usuarios");
  return { success: true };
}
