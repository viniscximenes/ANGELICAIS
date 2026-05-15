"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export type DecrementResult =
  | { success: true; deleted: boolean }
  | { success: false; error: string };

export async function decrementDeflatorOccurrenceAction(
  applicationId: string,
): Promise<DecrementResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system")) {
    return { success: false, error: "Sem permissão" };
  }

  const supabase = await createClient();

  const { data: existing, error: readErr } = await supabase
    .from("rv_deflator_applications")
    .select("id, occurrence_count")
    .eq("id", applicationId)
    .maybeSingle();

  if (readErr || !existing) {
    return { success: false, error: "Aplicação não encontrada" };
  }

  if (existing.occurrence_count <= 1) {
    const { error: delErr } = await supabase
      .from("rv_deflator_applications")
      .delete()
      .eq("id", applicationId);

    if (delErr) {
      return { success: false, error: "Erro ao apagar" };
    }

    revalidatePath("/config/rv");
    revalidatePath("/rv/atual");
    revalidatePath("/rv/passado");
    return { success: true, deleted: true };
  }

  const { error: updErr } = await supabase
    .from("rv_deflator_applications")
    .update({ occurrence_count: existing.occurrence_count - 1 })
    .eq("id", applicationId);

  if (updErr) {
    return { success: false, error: "Erro ao atualizar" };
  }

  revalidatePath("/config/rv");
  revalidatePath("/rv/atual");
  revalidatePath("/rv/passado");
  return { success: true, deleted: false };
}
