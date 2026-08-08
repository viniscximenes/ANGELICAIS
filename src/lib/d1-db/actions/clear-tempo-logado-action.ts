"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { dataRefHojeBR } from "../parse";

export type ClearTempoLogadoResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Limpa Tempo Logado + Indisponibilidade de HOJE (data_ref) — as duas
 * tabelas vêm do mesmo upload de BASE - 2, então são limpas juntas (mesmo
 * comportamento do BASE - 2 antigo).
 */
export async function clearTempoLogadoAction(): Promise<ClearTempoLogadoResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_d1_base")) {
    return { success: false, error: "Sem permissão para limpar a base" };
  }

  try {
    const admin = createAdminClient();
    const dataRef = dataRefHojeBR();

    const { error: errTempoLogado } = await admin
      .from("d1_tempo_logado")
      .delete()
      .eq("data_ref", dataRef);
    if (errTempoLogado) throw new Error(errTempoLogado.message);

    const { error: errIndisp } = await admin
      .from("d1_indisponibilidade")
      .delete()
      .eq("data_ref", dataRef);
    if (errIndisp) throw new Error(errIndisp.message);

    revalidatePath("/d-1/tempo-logado");
    revalidatePath("/d-1/indisponibilidade");
    revalidatePath("/gestor/tempo-logado");
    revalidatePath("/reports/tempo-indisponibilidade");
    return { success: true };
  } catch (err) {
    console.error("[clear-tempo-logado] erro:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro desconhecido",
    };
  }
}
