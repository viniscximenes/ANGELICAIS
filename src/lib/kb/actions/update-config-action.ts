"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export type UpdateConfigResult =
  | { success: true }
  | { success: false; error: string };

export async function updateConfigAction(
  promptSistema: string,
): Promise<UpdateConfigResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system")) {
    return { success: false, error: "Sem permissão" };
  }

  if (!promptSistema.trim()) {
    return { success: false, error: "Prompt não pode ficar vazio" };
  }

  const adminClient = createAdminClient();
  const { data: existing, error: fetchError } = await adminClient
    .from("kb_config")
    .select("id")
    .single();

  if (fetchError || !existing) {
    console.error("[update-config] erro ao localizar config:", fetchError);
    return { success: false, error: "Configuração não encontrada" };
  }

  const { error } = await adminClient
    .from("kb_config")
    .update({
      prompt_sistema: promptSistema.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id);

  if (error) {
    console.error("[update-config] erro:", error);
    return { success: false, error: "Erro ao salvar prompt" };
  }

  revalidatePath("/config/base-conhecimento");
  return { success: true };
}
