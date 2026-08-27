"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export type DeleteUserInput = {
  id: string;
};

export type DeleteUserResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Exclusão física (auth.users, que cascateia pra profiles). Bloqueada a
 * priori se o usuário tiver registros vinculados via FK NO ACTION
 * (diario_registros, monitorias, regras_desconto, rv_deflator_applications)
 * — sem essa checagem o Postgres rejeitaria a exclusão com um erro de FK cru.
 * Histórico de atendimento/retenção/KPI (retencao_atendimentos,
 * kpi_monthly_snapshots, d1_*) não tem FK pra profiles — não é afetado.
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
    .select("role")
    .eq("id", input.id)
    .maybeSingle();

  if (!target) {
    return { success: false, error: "Usuário não encontrado" };
  }

  if (target.role === "GESTOR") {
    return {
      success: false,
      error: "Não é possível excluir a gestora pelo painel",
    };
  }

  const [diario, monitoriaCreated, monitoriaFinalized, monitoriaSent, descontos, deflatores] =
    await Promise.all([
      adminClient
        .from("diario_registros")
        .select("id", { count: "exact", head: true })
        .eq("created_by", input.id),
      adminClient
        .from("monitorias")
        .select("id", { count: "exact", head: true })
        .eq("created_by", input.id),
      adminClient
        .from("monitorias")
        .select("id", { count: "exact", head: true })
        .eq("finalized_by", input.id),
      adminClient
        .from("monitorias")
        .select("id", { count: "exact", head: true })
        .eq("sent_by", input.id),
      adminClient
        .from("regras_desconto")
        .select("id", { count: "exact", head: true })
        .eq("created_by", input.id),
      adminClient
        .from("rv_deflator_applications")
        .select("id", { count: "exact", head: true })
        .eq("applied_by", input.id),
    ]);

  const bloqueios: string[] = [];
  if ((diario.count ?? 0) > 0) {
    bloqueios.push(`${diario.count} registro(s) de Diário de Bordo`);
  }
  const monitoriasCount =
    (monitoriaCreated.count ?? 0) +
    (monitoriaFinalized.count ?? 0) +
    (monitoriaSent.count ?? 0);
  if (monitoriasCount > 0) {
    bloqueios.push(`${monitoriasCount} vínculo(s) de Monitoria`);
  }
  if ((descontos.count ?? 0) > 0) {
    bloqueios.push(`${descontos.count} regra(s) de desconto`);
  }
  if ((deflatores.count ?? 0) > 0) {
    bloqueios.push(`${deflatores.count} aplicação(ões) de deflator de RV`);
  }

  if (bloqueios.length > 0) {
    return {
      success: false,
      error: `Não é possível excluir: usuário tem ${bloqueios.join(", ")} vinculado(s) por autoria. Reatribua ou remova esses registros antes de excluir.`,
    };
  }

  // Deleta via Auth Admin (não profiles diretamente) — profiles_id_fkey é
  // ON DELETE CASCADE de auth.users, então isso já apaga o profile junto e
  // não deixa a conta órfã no Supabase Auth.
  const { error } = await adminClient.auth.admin.deleteUser(input.id);

  if (error) {
    console.error("[delete-user] erro:", error);
    return { success: false, error: `Erro ao excluir: ${error.message}` };
  }

  revalidatePath("/configuracoes/usuarios");
  return { success: true };
}
