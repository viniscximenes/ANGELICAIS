"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { dataRefHojeBR } from "@/lib/d1-db/parse";
import { createAdminClient } from "@/lib/supabase/admin";

type ClearTmaResult = { success: true } | { success: false; error: string };

/** Limpa o TMA de HOJE (data_ref) da equipe do gestor logado. */
export async function clearTmaAction(): Promise<ClearTmaResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_d1_base")) {
    return { success: false, error: "Sem permissão para limpar a base" };
  }

  try {
    const admin = createAdminClient();
    const dataRef = dataRefHojeBR();

    const { error: erroTma } = await admin
      .from("d1_tma")
      .delete()
      .eq("data_ref", dataRef)
      .eq("gestor_id", user.profile.id);
    if (erroTma) throw new Error(erroTma.message);

    const { error: erroAtendimentos } = await admin
      .from("d1_tma_atendimentos")
      .delete()
      .eq("data_ref", dataRef)
      .eq("gestor_id", user.profile.id);
    if (erroAtendimentos) throw new Error(erroAtendimentos.message);

    revalidatePath("/reports/tma");
    return { success: true };
  } catch (err) {
    console.error("[clear-tma] erro:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro desconhecido",
    };
  }
}
