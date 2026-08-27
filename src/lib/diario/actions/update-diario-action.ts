"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

import { calcDeltaFromJornada } from "../time-format";
import type { DiarioCaso } from "../types";

export type UpdateDiarioInput = {
  id: string;
  operatorEmail: string;
  caso: DiarioCaso;
  dataOcorrido: string;
  tempoSegundos: number | null;
  tempoLogadoSegundos: number | null;
  glpi: string | null;
  descricao: string;
};

export type UpdateDiarioResult =
  | { success: true }
  | { success: false; error: string };

export async function updateDiarioAction(
  input: UpdateDiarioInput,
): Promise<UpdateDiarioResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system", user.profile.isAdminSkill)) {
    return { success: false, error: "Sem permissão" };
  }

  if (!input.descricao.trim()) {
    return { success: false, error: "Descrição obrigatória" };
  }

  if (input.caso === "pausa_autorizada") {
    if (input.tempoSegundos === null || input.tempoSegundos <= 0) {
      return { success: false, error: "Tempo da pausa é obrigatório" };
    }
  }
  if (input.caso === "fora_jornada") {
    if (input.tempoLogadoSegundos === null || input.tempoLogadoSegundos < 0) {
      return { success: false, error: "Tempo logado é obrigatório" };
    }
  }

  let tempoAJustificar: number | null = null;
  let tempoSegundos: number | null = null;
  let tempoLogado: number | null = null;

  if (input.caso === "fora_jornada") {
    tempoLogado = input.tempoLogadoSegundos;
    tempoAJustificar = calcDeltaFromJornada(input.tempoLogadoSegundos!);
  } else if (input.caso === "pausa_autorizada") {
    tempoSegundos = input.tempoSegundos;
  } else {
    tempoSegundos = input.tempoSegundos;
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("diario_registros")
    .update({
      operator_email: input.operatorEmail.trim().toLowerCase(),
      caso: input.caso,
      data_ocorrido: input.dataOcorrido,
      tempo_logado_segundos: tempoLogado,
      tempo_a_justificar_segundos: tempoAJustificar,
      tempo_segundos: tempoSegundos,
      glpi: input.glpi?.trim() || null,
      descricao: input.descricao.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);

  if (error) {
    console.error("[update-diario] erro:", error);
    return { success: false, error: "Erro ao atualizar" };
  }

  revalidatePath("/registros/diario");
  return { success: true };
}
