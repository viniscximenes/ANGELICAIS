"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { removerAnexo } from "../anexo";

export type DeleteArtigoResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteArtigoAction(
  id: string,
): Promise<DeleteArtigoResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system", user.profile.isAdminSkill)) {
    return { success: false, error: "Sem permissão" };
  }

  const adminClient = createAdminClient();

  const { data: atual } = await adminClient
    .from("kb_artigos")
    .select("anexo_url")
    .eq("id", id)
    .single();

  const { error } = await adminClient.from("kb_artigos").delete().eq("id", id);

  if (error) {
    console.error("[delete-artigo] erro:", error);
    return { success: false, error: "Erro ao excluir artigo" };
  }

  if (atual?.anexo_url) await removerAnexo(atual.anexo_url);

  revalidatePath("/config/base-conhecimento");
  return { success: true };
}
