"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export type SetPasswordInput = {
  id: string;
  newPassword: string;
};

export type SetPasswordResult =
  | { success: true; password: string }
  | { success: false; error: string };

export async function setUserPasswordAction(
  input: SetPasswordInput,
): Promise<SetPasswordResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system")) {
    return { success: false, error: "Sem permissão" };
  }

  if (!input.newPassword || input.newPassword.length < 8) {
    return { success: false, error: "Senha deve ter pelo menos 8 caracteres" };
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

  const { error } = await adminClient.auth.admin.updateUserById(input.id, {
    password: input.newPassword,
  });

  if (error) {
    console.error("[set-password] erro:", error);
    return {
      success: false,
      error: `Erro ao definir senha: ${error.message}`,
    };
  }

  return { success: true, password: input.newPassword };
}
