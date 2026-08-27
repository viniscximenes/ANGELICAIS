"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export type DeleteMarcaResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteMarcaAction(id: string): Promise<DeleteMarcaResult> {
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

  const { count } = await adminClient
    .from("planos")
    .select("id", { count: "exact", head: true })
    .eq("marca_id", id);

  if ((count ?? 0) > 0) {
    return {
      success: false,
      error: `Esta marca tem ${count} plano(s) vinculado(s). Apague os planos primeiro ou desative a marca.`,
    };
  }

  const { error } = await adminClient.from("marcas").delete().eq("id", id);

  if (error) {
    console.error("[delete-marca] erro:", error);
    return { success: false, error: "Erro ao apagar" };
  }

  revalidatePath("/config/planos");
  revalidatePath("/atendimento");
  return { success: true };
}
