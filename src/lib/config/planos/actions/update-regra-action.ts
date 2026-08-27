"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

import { validateRegra } from "../validate-regra";

export type UpdateRegraInput = {
  id: string;
  tempoMinMeses?: number;
  tempoMaxMeses?: number | null;
  descontoMaxPct?: number;
  duracaoMeses?: number;
};

export type UpdateRegraResult =
  | { success: true }
  | { success: false; error: string };

export async function updateRegraAction(
  input: UpdateRegraInput,
): Promise<UpdateRegraResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system", user.profile.isAdminSkill)) {
    return { success: false, error: "Sem permissão" };
  }

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Erro",
    };
  }

  const { data: current, error: fetchErr } = await adminClient
    .from("regras_desconto")
    .select("*")
    .eq("id", input.id)
    .maybeSingle();

  if (fetchErr || !current) {
    return { success: false, error: "Regra não encontrada" };
  }

  const validation = validateRegra({
    tempoMinMeses: input.tempoMinMeses ?? current.tempo_min_meses,
    tempoMaxMeses:
      input.tempoMaxMeses !== undefined
        ? input.tempoMaxMeses
        : current.tempo_max_meses,
    descontoMaxPct: input.descontoMaxPct ?? current.desconto_max_pct,
    duracaoMeses: input.duracaoMeses ?? current.duracao_meses,
  });

  if (!validation.valid) return { success: false, error: validation.error };

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.tempoMinMeses !== undefined)
    updates.tempo_min_meses = input.tempoMinMeses;
  if (input.tempoMaxMeses !== undefined)
    updates.tempo_max_meses = input.tempoMaxMeses;
  if (input.descontoMaxPct !== undefined)
    updates.desconto_max_pct = input.descontoMaxPct;
  if (input.duracaoMeses !== undefined)
    updates.duracao_meses = input.duracaoMeses;

  const { error } = await adminClient
    .from("regras_desconto")
    .update(updates)
    .eq("id", input.id);

  if (error) {
    console.error("[update-regra] erro:", error);
    return { success: false, error: "Erro ao atualizar" };
  }

  revalidatePath("/config/planos");
  revalidatePath("/atendimento");
  return { success: true };
}
