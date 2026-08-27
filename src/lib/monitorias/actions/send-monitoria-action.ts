"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export type SendMonitoriaResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Marca uma monitoria como "sent" (enviada ao Forms pelo ADM).
 * Só ADM pode executar. Monitoria precisa estar em status='finalized'.
 */
export async function sendMonitoriaAction(
  id: string,
): Promise<SendMonitoriaResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system", user.profile.isAdminSkill)) {
    return { success: false, error: "Sem permissão" };
  }

  const supabase = await createClient();

  const { data: monitoria, error: readErr } = await supabase
    .from("monitorias")
    .select("status")
    .eq("id", id)
    .maybeSingle();

  if (readErr || !monitoria) {
    return { success: false, error: "Monitoria não encontrada" };
  }

  if (monitoria.status === "pending") {
    return {
      success: false,
      error:
        "Não é possível enviar uma monitoria pendente. AUX precisa finalizar antes.",
    };
  }

  if (monitoria.status === "sent") {
    return { success: false, error: "Monitoria já foi enviada" };
  }

  const { error } = await supabase
    .from("monitorias")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      sent_by: user.profile.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[send-monitoria] erro:", error);
    return { success: false, error: "Erro ao enviar" };
  }

  revalidatePath("/registros/monitoria");
  revalidatePath(`/registros/monitoria/${id}`);
  return { success: true };
}
