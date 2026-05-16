"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

export type FinalizeResult =
  | { success: true }
  | { success: false; error: string };

export async function finalizeMonitoriaAction(
  id: string,
): Promise<FinalizeResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  const supabase = await createClient();

  const { data: monitoria, error: readErr } = await supabase
    .from("monitorias")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (readErr || !monitoria) {
    return { success: false, error: "Monitoria não encontrada" };
  }

  if (monitoria.status === "finalized") {
    return { success: false, error: "Monitoria já está finalizada" };
  }

  const missing: string[] = [];
  if (monitoria.encaminhou_pesquisa === null)
    missing.push("Pesquisa de satisfação");
  if (!monitoria.sinalizacao_principal) missing.push("Sinalização principal");
  if (!monitoria.nota_apresentacao) missing.push("Nota de Apresentação");
  if (!monitoria.nota_comunicacao) missing.push("Nota de Comunicação");
  if (!monitoria.nota_processo) missing.push("Nota de Processo");
  if (!monitoria.resumo_atendimento || !monitoria.resumo_atendimento.trim()) {
    missing.push("Resumo do atendimento");
  }

  if (missing.length > 0) {
    return {
      success: false,
      error: `Preencha: ${missing.join(", ")}`,
    };
  }

  const { error } = await supabase
    .from("monitorias")
    .update({
      status: "finalized",
      finalized_at: new Date().toISOString(),
      finalized_by: user.profile.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[finalize-monitoria] erro:", error);
    return { success: false, error: "Erro ao finalizar" };
  }

  revalidatePath("/registros/monitoria");
  revalidatePath(`/registros/monitoria/${id}`);
  return { success: true };
}
