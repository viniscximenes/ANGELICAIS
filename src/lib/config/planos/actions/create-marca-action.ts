"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export type CreateMarcaResult =
  | { success: true; id: string }
  | { success: false; error: string };

export async function createMarcaAction(
  nome: string,
): Promise<CreateMarcaResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system", user.profile.isAdminSkill)) {
    return { success: false, error: "Sem permissão" };
  }

  const nomeTrimmed = nome.trim();
  if (nomeTrimmed.length < 2) {
    return { success: false, error: "Nome muito curto" };
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

  const { data, error } = await adminClient
    .from("marcas")
    .insert({ nome: nomeTrimmed })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Já existe uma marca com esse nome" };
    }
    console.error("[create-marca] erro:", error);
    return { success: false, error: "Erro ao criar marca" };
  }

  revalidatePath("/config/planos");
  revalidatePath("/atendimento");
  return { success: true, id: data.id };
}
