"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export type UpdatePlanoInput = {
  id: string;
  nome?: string;
  valor?: number;
  temOtt?: boolean;
  ordem?: number;
};

export type UpdatePlanoResult =
  | { success: true }
  | { success: false; error: string };

export async function updatePlanoAction(
  input: UpdatePlanoInput,
): Promise<UpdatePlanoResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system", user.profile.isAdminSkill)) {
    return { success: false, error: "Sem permissão" };
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.nome !== undefined) {
    const t = input.nome.trim();
    if (t.length < 1) return { success: false, error: "Nome obrigatório" };
    updates.nome = t;
  }

  if (input.valor !== undefined) {
    if (input.valor <= 0) return { success: false, error: "Valor inválido" };
    updates.valor = input.valor;
  }

  if (input.temOtt !== undefined) updates.tem_ott = input.temOtt;
  if (input.ordem !== undefined) updates.ordem = input.ordem;

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
    .from("planos")
    .update(updates)
    .eq("id", input.id);

  if (error) {
    console.error("[update-plano] erro:", error);
    return { success: false, error: "Erro ao atualizar" };
  }

  revalidatePath("/config/planos");
  revalidatePath("/atendimento");
  return { success: true };
}
