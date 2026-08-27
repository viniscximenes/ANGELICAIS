"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export type SaveEvolucaoResult =
  | { success: true; mode: "insert" | "update" }
  | { success: false; error: string };

const WINDOW_MINUTES = 10;

/**
 * Salva snapshot da TX da equipe.
 *
 * Anti-duplicação: se o snapshot mais recente foi criado nos últimos 10
 * minutos, UPDATE (substitui). Caso contrário, INSERT (novo ponto).
 */
export async function saveEvolucaoAction(
  txValue: number,
): Promise<SaveEvolucaoResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system", user.profile.isAdminSkill)) {
    return { success: false, error: "Sem permissão" };
  }

  if (
    typeof txValue !== "number" ||
    isNaN(txValue) ||
    txValue < 0 ||
    txValue > 100
  ) {
    return { success: false, error: "TX inválida" };
  }

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Erro de configuração",
    };
  }

  const formatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const reportTime = formatter.format(new Date());

  const txRounded = Math.round(txValue * 100) / 100;

  const windowAgoIso = new Date(
    Date.now() - WINDOW_MINUTES * 60 * 1000,
  ).toISOString();

  const { data: recentSnapshot, error: fetchErr } = await adminClient
    .from("d1_evolucao_tx")
    .select("id, created_at")
    .gte("created_at", windowAgoIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchErr) {
    console.error("[save-evolucao] erro ao buscar recente:", fetchErr);
    return { success: false, error: "Erro ao buscar histórico" };
  }

  let mode: "insert" | "update" = "insert";

  if (recentSnapshot) {
    const { error: updateErr } = await adminClient
      .from("d1_evolucao_tx")
      .update({
        tx_value: txRounded,
        report_time: reportTime,
        created_at: new Date().toISOString(),
      })
      .eq("id", recentSnapshot.id);

    if (updateErr) {
      console.error("[save-evolucao] erro update:", updateErr);
      return { success: false, error: "Erro ao atualizar snapshot" };
    }

    mode = "update";
  } else {
    const { error: insertErr } = await adminClient
      .from("d1_evolucao_tx")
      .insert({
        tx_value: txRounded,
        report_time: reportTime,
      });

    if (insertErr) {
      console.error("[save-evolucao] erro insert:", insertErr);
      return { success: false, error: "Erro ao salvar snapshot" };
    }
  }

  revalidatePath("/d-1/consolidado");
  return { success: true, mode };
}
