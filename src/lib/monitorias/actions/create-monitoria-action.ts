"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

import { applyMonitoriaRetention } from "../apply-retention";

export type CreateMonitoriaInput = {
  operatorEmail: string;
  auxResponsibleEmail: string;
  idChamada: string;
  contratoCliente: string;
  dataAtendimento: string;
  linkOnedrive: string;
};

export type CreateMonitoriaResult =
  | { success: true; id: string }
  | { success: false; error: string };

export async function createMonitoriaAction(
  input: CreateMonitoriaInput,
): Promise<CreateMonitoriaResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system")) {
    return { success: false, error: "Sem permissão" };
  }

  if (!input.operatorEmail.trim())
    return { success: false, error: "Operador obrigatório" };
  if (!input.auxResponsibleEmail.trim())
    return { success: false, error: "AUX responsável obrigatório" };
  if (!input.idChamada.trim())
    return { success: false, error: "ID da chamada obrigatório" };
  if (!/^\d+$/.test(input.contratoCliente.trim())) {
    return { success: false, error: "Contrato deve conter apenas números" };
  }
  if (!input.dataAtendimento.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return { success: false, error: "Data inválida" };
  }
  if (!input.linkOnedrive.match(/^https?:\/\//)) {
    return {
      success: false,
      error: "Link inválido (deve começar com http:// ou https://)",
    };
  }

  await applyMonitoriaRetention(input.dataAtendimento);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("monitorias")
    .insert({
      operator_email: input.operatorEmail.trim().toLowerCase(),
      aux_responsible_email: input.auxResponsibleEmail.trim().toLowerCase(),
      id_chamada: input.idChamada.trim(),
      contrato_cliente: input.contratoCliente.trim(),
      data_atendimento: input.dataAtendimento,
      link_onedrive: input.linkOnedrive.trim(),
      status: "pending",
      created_by: user.profile.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[create-monitoria] erro:", error);
    return { success: false, error: "Erro ao criar monitoria" };
  }

  revalidatePath("/registros/monitoria");
  return { success: true, id: data.id };
}
