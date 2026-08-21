"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export type DeleteArtigoResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteArtigoAction(
  id: string,
): Promise<DeleteArtigoResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system")) {
    return { success: false, error: "Sem permissão" };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.from("kb_artigos").delete().eq("id", id);

  if (error) {
    console.error("[delete-artigo] erro:", error);
    return { success: false, error: "Erro ao excluir artigo" };
  }

  revalidatePath("/config/base-conhecimento");
  return { success: true };
}
