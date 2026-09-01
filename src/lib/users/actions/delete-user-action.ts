"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

type DeleteUserInput = {
  id: string;
};

type DeleteUserResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Exclusão física via Auth Admin (auth.users), que cascateia para profiles
 * e, agora, para todo o histórico vinculado ao gestor: d1_consolidado,
 * d1_indisponibilidade, d1_tempo_logado, kpi_operadores_atualizacoes e
 * rv_deflator_applications tiveram suas FKs migradas para ON DELETE CASCADE.
 * Essa perda de histórico é intencional — não há mais checagem que barre a
 * exclusão de um GESTOR.
 */
export async function deleteUserAction(
  input: DeleteUserInput,
): Promise<DeleteUserResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system", user.profile.isAdminSkill)) {
    return { success: false, error: "Sem permissão" };
  }

  if (input.id === user.profile.id) {
    return { success: false, error: "Você não pode excluir a si próprio" };
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
    .select("id")
    .eq("id", input.id)
    .maybeSingle();

  if (!target) {
    return { success: false, error: "Usuário não encontrado" };
  }

  // Deleta via Auth Admin (não profiles diretamente) — profiles_id_fkey é
  // ON DELETE CASCADE de auth.users, então isso apaga o profile junto, não
  // deixa a conta órfã no Supabase Auth e cascateia para todo o histórico
  // (D1, KPIs, RV) vinculado ao usuário.
  const { error } = await adminClient.auth.admin.deleteUser(input.id);

  if (error) {
    console.error("[delete-user] erro:", error);
    return { success: false, error: `Erro ao excluir: ${error.message}` };
  }

  revalidatePath("/configuracoes/usuarios");
  return { success: true };
}
