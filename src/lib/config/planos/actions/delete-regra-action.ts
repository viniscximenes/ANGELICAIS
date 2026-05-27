"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export type DeleteRegraResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteRegraAction(id: string): Promise<DeleteRegraResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system")) {
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

  const { error } = await adminClient
    .from("regras_desconto")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[delete-regra] erro:", error);
    return { success: false, error: "Erro ao apagar regra" };
  }

  revalidatePath("/config/planos");
  revalidatePath("/atendimento");
  return { success: true };
}
