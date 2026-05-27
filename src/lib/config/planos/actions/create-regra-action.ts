"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

import { validateRegra } from "../validate-regra";

export type CreateRegraInput = {
  temOtt: boolean;
  tempoMinMeses: number;
  tempoMaxMeses: number | null;
  descontoMaxPct: number;
  duracaoMeses: number;
};

export type CreateRegraResult =
  | { success: true; id: string }
  | { success: false; error: string };

export async function createRegraAction(
  input: CreateRegraInput,
): Promise<CreateRegraResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system")) {
    return { success: false, error: "Sem permissão" };
  }

  const validation = validateRegra(input);
  if (!validation.valid) return { success: false, error: validation.error };

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Erro",
    };
  }

  const { data: maxOrdem } = await adminClient
    .from("regras_desconto")
    .select("ordem")
    .eq("tem_ott", input.temOtt)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const novaOrdem = (maxOrdem?.ordem ?? 0) + 1;

  const { data, error } = await adminClient
    .from("regras_desconto")
    .insert({
      tem_ott: input.temOtt,
      tempo_min_meses: input.tempoMinMeses,
      tempo_max_meses: input.tempoMaxMeses,
      desconto_max_pct: input.descontoMaxPct,
      duracao_meses: input.duracaoMeses,
      ordem: novaOrdem,
      created_by: user.profile.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[create-regra] erro:", error);
    return { success: false, error: "Erro ao criar regra" };
  }

  revalidatePath("/config/planos");
  revalidatePath("/atendimento");
  return { success: true, id: data.id };
}
