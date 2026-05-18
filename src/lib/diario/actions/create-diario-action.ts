"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

import { applyDiarioRetention } from "../apply-retention";
import { calcDeltaFromJornada } from "../time-format";
import type { DiarioCaso } from "../types";

export type CreateDiarioInput = {
  operatorEmail: string;
  caso: DiarioCaso;
  dataOcorrido: string;

  tempoSegundos: number | null;

  tempoLogadoSegundos: number | null;

  glpi: string | null;
  descricao: string;
};

export type CreateDiarioResult =
  | { success: true; id: string }
  | { success: false; error: string };

export async function createDiarioAction(
  input: CreateDiarioInput,
): Promise<CreateDiarioResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system")) {
    return { success: false, error: "Sem permissão" };
  }

  if (!input.operatorEmail.trim())
    return { success: false, error: "Operador obrigatório" };
  if (
    !["pausa_autorizada", "fora_jornada", "geral", "outros"].includes(
      input.caso,
    )
  ) {
    return { success: false, error: "Caso inválido" };
  }
  if (!input.dataOcorrido.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return { success: false, error: "Data inválida" };
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

  await applyDiarioRetention(input.dataOcorrido);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("diario_registros")
    .insert({
      operator_email: input.operatorEmail.trim().toLowerCase(),
      caso: input.caso,
      data_ocorrido: input.dataOcorrido,
      tempo_logado_segundos: tempoLogado,
      tempo_a_justificar_segundos: tempoAJustificar,
      tempo_segundos: tempoSegundos,
      glpi: input.glpi?.trim() || null,
      descricao: input.descricao.trim(),
      created_by: user.profile.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[create-diario] erro:", error);
    return { success: false, error: "Erro ao criar registro" };
  }

  revalidatePath("/registros/diario");
  return { success: true, id: data.id };
}
