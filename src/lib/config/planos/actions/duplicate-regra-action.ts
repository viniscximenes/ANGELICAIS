"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export type DuplicateRegraResult =
  | { success: true; id: string }
  | { success: false; error: string };

export async function duplicateRegraAction(
  id: string,
): Promise<DuplicateRegraResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system")) {
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

  const { data: original, error: fetchErr } = await adminClient
    .from("regras_desconto")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !original) {
    return { success: false, error: "Regra não encontrada" };
  }

  const { data: maxOrdem } = await adminClient
    .from("regras_desconto")
    .select("ordem")
    .eq("tem_ott", original.tem_ott)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const novaOrdem = (maxOrdem?.ordem ?? 0) + 1;

  const { data, error } = await adminClient
    .from("regras_desconto")
    .insert({
      tem_ott: original.tem_ott,
      tempo_min_meses: original.tempo_min_meses,
      tempo_max_meses: original.tempo_max_meses,
      desconto_max_pct: original.desconto_max_pct,
      duracao_meses: original.duracao_meses,
      ordem: novaOrdem,
      created_by: user.profile.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[duplicate-regra] erro:", error);
    return { success: false, error: "Erro ao duplicar" };
  }

  revalidatePath("/config/planos");
  revalidatePath("/atendimento");
  return { success: true, id: data.id };
}
