"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

import type { PausaProgramadaRow } from "../types";

export type SalvarPausasResult =
  | { success: true; total: number }
  | { success: false; error: string };

/**
 * Upsert em base_pausas_programadas por operator_email (UNIQUE) — sobrescreve
 * quem está na colagem, mantém intactos os demais registros já cadastrados.
 */
export async function salvarPausasAction(
  linhas: PausaProgramadaRow[],
): Promise<SalvarPausasResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system")) {
    return { success: false, error: "Sem permissão para salvar a base" };
  }

  if (linhas.length === 0) {
    return { success: false, error: "Nenhum operador para salvar" };
  }

  const admin = createAdminClient();

  const upsertRows = linhas.map((l) => ({
    operator_email: l.operatorEmail,
    celula: l.celula || null,
    hora_login: l.horaLogin,
    hora_logout: l.horaLogout,
    descanso_1: l.descanso1 || null,
    pausa_20: l.pausa20 || null,
    descanso_2: l.descanso2 || null,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await admin
    .from("base_pausas_programadas")
    .upsert(upsertRows, { onConflict: "operator_email" });

  if (error) {
    console.error("[salvar-pausas] erro:", error.message);
    return { success: false, error: "Erro ao salvar no banco" };
  }

  revalidatePath("/bases/pausas");

  return { success: true, total: upsertRows.length };
}
