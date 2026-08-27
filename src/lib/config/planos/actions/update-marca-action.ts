"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export type UpdateMarcaInput = {
  id: string;
  nome?: string;
  isActive?: boolean;
};

export type UpdateMarcaResult =
  | { success: true }
  | { success: false; error: string };

export async function updateMarcaAction(
  input: UpdateMarcaInput,
): Promise<UpdateMarcaResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system", user.profile.isAdminSkill)) {
    return { success: false, error: "Sem permissão" };
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.nome !== undefined) {
    const nomeTrimmed = input.nome.trim();
    if (nomeTrimmed.length < 2) {
      return { success: false, error: "Nome muito curto" };
    }
    updates.nome = nomeTrimmed;
  }

  if (input.isActive !== undefined) {
    updates.is_active = input.isActive;
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

  const { error } = await adminClient
    .from("marcas")
    .update(updates)
    .eq("id", input.id);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Já existe uma marca com esse nome" };
    }
    console.error("[update-marca] erro:", error);
    return { success: false, error: "Erro ao atualizar" };
  }

  revalidatePath("/config/planos");
  revalidatePath("/atendimento");
  return { success: true };
}
