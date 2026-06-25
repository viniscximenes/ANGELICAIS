"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { sanitizeEmailLocal } from "../sanitize-email-local";
import type { UserRole } from "../types";
import { isValidUsernameFormat } from "../validate-username";

export type CreateUserInput = {
  fullName: string;
  username: string;
  emailCorporativoLocal: string;
  role: UserRole;
  password: string;
};

export type CreateUserResult =
  | { success: true; userId: string; password: string }
  | { success: false; error: string };

const INTERNAL_DOMAIN = "@interno.angelicais.app";
const CORP_DOMAIN = "@alloha.com";

export async function createUserAction(
  input: CreateUserInput,
): Promise<CreateUserResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system")) {
    return { success: false, error: "Sem permissão" };
  }

  if (!input.fullName.trim() || input.fullName.trim().length < 3) {
    return {
      success: false,
      error: "Nome completo deve ter pelo menos 3 caracteres",
    };
  }
  if (!isValidUsernameFormat(input.username)) {
    return {
      success: false,
      error:
        "Username inválido (apenas letras, números, ponto e hífen; 3-32 caracteres)",
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
  if (!input.password || input.password.length < 8) {
    return { success: false, error: "Senha deve ter pelo menos 8 caracteres" };
  }
  // GESTOR/ADM etc. Normalmente criados via script admin/SQL — NÃO pela UI
  // (a regex de username acima exige o padrão nome.sobrenome).
  if (!["OP", "AUX", "ADM", "GESTOR"].includes(input.role)) {
    return { success: false, error: "Role inválida" };
  }

  const username = input.username.trim().toLowerCase();
  const emailInterno = `${username}${INTERNAL_DOMAIN}`;
  const emailCorporativo = `${sanitizedLocal}${CORP_DOMAIN}`;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existing) {
    return { success: false, error: "Username já cadastrado" };
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

  const { data: authUser, error: authError } =
    await adminClient.auth.admin.createUser({
      email: emailInterno,
      password: input.password,
      email_confirm: true,
    });

  if (authError || !authUser.user) {
    console.error("[create-user] erro auth:", authError);
    return {
      success: false,
      error: `Erro ao criar conta: ${authError?.message ?? "desconhecido"}`,
    };
  }

  const { error: profileError } = await adminClient.from("profiles").insert({
    id: authUser.user.id,
    username,
    full_name: input.fullName.trim(),
    email_corporativo: emailCorporativo,
    role: input.role,
    is_active: true,
  });

  if (profileError) {
    console.error("[create-user] erro profile:", profileError);
    await adminClient.auth.admin.deleteUser(authUser.user.id);
    return {
      success: false,
      error: `Erro ao criar profile: ${profileError.message}`,
    };
  }

  revalidatePath("/config/usuarios");
  return {
    success: true,
    userId: authUser.user.id,
    password: input.password,
  };
}
