"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export type LimparPausasResult =
  | { success: true }
  | { success: false; error: string };

/** Apaga todos os registros de base_pausas_programadas. */
export async function limparPausasAction(): Promise<LimparPausasResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system")) {
    return { success: false, error: "Sem permissão para limpar a base" };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("base_pausas_programadas")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) {
    console.error("[limpar-pausas] erro:", error.message);
    return { success: false, error: "Erro ao limpar a base" };
  }

  revalidatePath("/bases/pausas");

  return { success: true };
}
