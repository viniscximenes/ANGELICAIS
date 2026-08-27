"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

import { sanitizeEmailLocal } from "../sanitize-email-local";

export type UpdateUserInput = {
  id: string;
  fullName: string;
  emailCorporativoLocal: string;
};

export type UpdateUserResult =
  | { success: true }
  | { success: false; error: string };

const CORP_DOMAIN = "@alloha.com";

export async function updateUserAction(
  input: UpdateUserInput,
): Promise<UpdateUserResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system", user.profile.isAdminSkill)) {
    return { success: false, error: "Sem permissão" };
  }

  if (input.id === user.profile.id) {
    return { success: false, error: "Você não pode editar a si próprio" };
  }

  if (!input.fullName.trim() || input.fullName.trim().length < 3) {
    return {
      success: false,
      error: "Nome completo deve ter pelo menos 3 caracteres",
    };
  }
  if (!input.emailCorporativoLocal.trim()) {
    return { success: false, error: "Email corporativo obrigatório" };
  }
  const sanitizedLocal = sanitizeEmailLocal(input.emailCorporativoLocal);
  if (!sanitizedLocal) {
    return {
      success: false,
      error:
        "Email corporativo inválido (use apenas letras, números, ponto e hífen)",
    };
  }

  const emailCorporativo = `${sanitizedLocal}${CORP_DOMAIN}`;

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
      error: "Não é possível editar a gestora pelo painel",
    };
  }

  const { error } = await adminClient
    .from("profiles")
    .update({
      full_name: input.fullName.trim(),
      email_corporativo: emailCorporativo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);

  if (error) {
    console.error("[update-user] erro:", error);
    return { success: false, error: "Erro ao atualizar" };
  }

  revalidatePath("/configuracoes/usuarios");
  return { success: true };
}
