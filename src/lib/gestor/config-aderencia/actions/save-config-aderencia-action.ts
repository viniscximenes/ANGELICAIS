"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

import {
  normalizarHoraMeta,
  normalizarTolerancia,
  serializarConfigAderencia,
  type ChaveHoraAderencia,
  type ConfigAderencia,
} from "../types";

export type SaveConfigAderenciaResult =
  | { success: true; config: ConfigAderencia }
  | { success: false; error: string };

const CAMPOS_HORA: [ChaveHoraAderencia, string][] = [
  ["metaLoginManha", "Hora de login (manhã)"],
  ["metaLoginTarde", "Hora de login (tarde)"],
  ["metaP10Primeira", "Hora da 1ª Pausa 10"],
  ["metaP20", "Hora da Pausa 20"],
  ["metaP10Segunda", "Hora da 2ª Pausa 10"],
];

/**
 * Salva a config de aderência em `gestor_config_fantasia.config_aderencia`.
 * Mesmo padrão de saveConfigTabelaAction: upsert por gestor_id na sessão do
 * próprio gestor (respeita RLS — ninguém escreve na config de outro).
 *
 * Valida antes de gravar: um "25:70" salvo viraria comparação silenciosamente
 * errada na tabela de aderência, não um erro visível.
 */
export async function saveConfigAderenciaAction(
  entrada: ConfigAderencia,
): Promise<SaveConfigAderenciaResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (user.profile.role !== "GESTOR") {
    return { success: false, error: "Sem permissão" };
  }

  const config = { ...entrada } as ConfigAderencia;

  for (const [campo, rotulo] of CAMPOS_HORA) {
    const normalizado = normalizarHoraMeta(entrada?.[campo]);
    if (!normalizado) {
      return { success: false, error: `${rotulo}: use o formato HH:MM (00:00 a 23:59).` };
    }
    config[campo] = normalizado;
  }

  const tolerancia = normalizarTolerancia(entrada?.toleranciaMin);
  if (tolerancia === null) {
    return { success: false, error: "Tolerância: use um valor inteiro entre 0 e 120 minutos." };
  }
  config.toleranciaMin = tolerancia;

  const supabase = await createClient();

  const { error } = await supabase.from("gestor_config_fantasia").upsert(
    {
      gestor_id: user.profile.id,
      config_aderencia: serializarConfigAderencia(config),
    },
    { onConflict: "gestor_id" },
  );

  if (error) {
    console.error("[saveConfigAderenciaAction] erro:", error.message);
    return { success: false, error: "Erro ao salvar configuração." };
  }

  revalidatePath("/reports/tempo-indisponibilidade/analitico");

  return { success: true, config };
}
