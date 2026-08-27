"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export type UpdateTemaResult =
  | { success: true }
  | { success: false; error: string };

export async function updateTemaAction(input: {
  id: string;
  nome: string;
  textoMotivo: string;
}): Promise<UpdateTemaResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system", user.profile.isAdminSkill)) {
    return { success: false, error: "Sem permissão" };
  }

  const nome = input.nome.trim();
  const textoMotivo = input.textoMotivo.trim();
  if (!nome) return { success: false, error: "Nome é obrigatório" };
  if (!textoMotivo) {
    return { success: false, error: "Texto do motivo é obrigatório" };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("db_temas")
    .update({
      nome,
      texto_motivo: textoMotivo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);

  if (error) {
    console.error("[update-tema] erro:", error.message);
    return { success: false, error: "Erro ao atualizar tema" };
  }

  revalidatePath("/config/db");
  return { success: true };
}
