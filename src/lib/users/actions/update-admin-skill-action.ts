"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export type UpdateAdminSkillInput = {
  id: string;
  isAdminSkill: boolean;
};

export type UpdateAdminSkillResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Liga/desliga profiles.is_admin_skill — flag aditiva que só faz sentido
 * pra GESTOR (acumula o Painel Adm sem perder o que já tinha). Nunca
 * substitui profiles.role; ver getSidebarSectionsForRole/can().
 */
export async function updateAdminSkillAction(
  input: UpdateAdminSkillInput,
): Promise<UpdateAdminSkillResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system", user.profile.isAdminSkill)) {
    return { success: false, error: "Sem permissão" };
  }

  if (input.id === user.profile.id) {
    return { success: false, error: "Você não pode alterar a si próprio" };
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

  if (target.role !== "GESTOR") {
    return {
      success: false,
      error: "Skill de administrador só pode ser atribuída a um GESTOR",
    };
  }

  const { error } = await adminClient
    .from("profiles")
    .update({
      is_admin_skill: input.isAdminSkill,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);

  if (error) {
    console.error("[update-admin-skill] erro:", error);
    return { success: false, error: "Erro ao atualizar" };
  }

  revalidatePath("/configuracoes/usuarios");
  return { success: true };
}
