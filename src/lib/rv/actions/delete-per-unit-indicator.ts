"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export type DeletePerUnitResult =
  | { success: true }
  | { success: false; error: string };

export async function deletePerUnitIndicatorAction(
  id: string,
): Promise<DeletePerUnitResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system")) {
    return { success: false, error: "Sem permissão" };
  }

  if (!id) return { success: false, error: "ID obrigatório" };

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erro" };
  }

  const { error } = await adminClient
    .from("rv_per_unit_indicators")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[delete-per-unit] erro:", error);
    return { success: false, error: "Erro ao remover" };
  }

  revalidatePath("/config/rv");
  revalidatePath("/rv/atual");
  revalidatePath("/rv/passado");
  return { success: true };
}
