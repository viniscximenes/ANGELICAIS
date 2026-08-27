"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

import type { NotaAvaliacao, SinalizacaoPrincipal } from "../types";

export type UpdateMonitoriaInput = {
  id: string;
  encaminhouPesquisa: boolean | null;
  sinalizacaoPrincipal: SinalizacaoPrincipal | null;
  notaApresentacao: NotaAvaliacao | null;
  notaComunicacao: NotaAvaliacao | null;
  notaProcesso: NotaAvaliacao | null;
  resumoAtendimento: string | null;
};

export type UpdateMonitoriaResult =
  | { success: true }
  | { success: false; error: string };

export async function updateMonitoriaAction(
  input: UpdateMonitoriaInput,
): Promise<UpdateMonitoriaResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  const isAdm = can(user.profile.role, "manage_system", user.profile.isAdminSkill);
  const isAux = user.profile.role === "AUX";

  if (!isAdm && !isAux) {
    return { success: false, error: "Sem permissão" };
  }

  const supabase = await createClient();

  const { data: current } = await supabase
    .from("monitorias")
    .select("status")
    .eq("id", input.id)
    .maybeSingle();

  if (current?.status === "sent") {
    return {
      success: false,
      error:
        "Esta monitoria já foi enviada ao Forms e não pode mais ser editada.",
    };
  }

  const { error } = await supabase
    .from("monitorias")
    .update({
      encaminhou_pesquisa: input.encaminhouPesquisa,
      sinalizacao_principal: input.sinalizacaoPrincipal,
      nota_apresentacao: input.notaApresentacao,
      nota_comunicacao: input.notaComunicacao,
      nota_processo: input.notaProcesso,
      resumo_atendimento: input.resumoAtendimento,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);

  if (error) {
    console.error("[update-monitoria] erro:", error);
    return {
      success: false,
      error: "Erro ao atualizar (verifique permissão e status)",
    };
  }

  revalidatePath("/registros/monitoria");
  revalidatePath(`/registros/monitoria/${input.id}`);
  return { success: true };
}
