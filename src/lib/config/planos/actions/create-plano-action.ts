"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export type CreatePlanoInput = {
  marcaId: string;
  nome: string;
  valor: number;
  temOtt: boolean;
};

export type CreatePlanoResult =
  | { success: true; id: string }
  | { success: false; error: string };

export async function createPlanoAction(
  input: CreatePlanoInput,
): Promise<CreatePlanoResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system")) {
    return { success: false, error: "Sem permissão" };
  }

  const nomeTrimmed = input.nome.trim();
  if (nomeTrimmed.length < 1)
    return { success: false, error: "Nome obrigatório" };
  if (input.valor <= 0)
    return { success: false, error: "Valor deve ser maior que zero" };

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
    .from("planos")
    .select("ordem")
    .eq("marca_id", input.marcaId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const novaOrdem = (maxOrdem?.ordem ?? 0) + 1;

  const { data, error } = await adminClient
    .from("planos")
    .insert({
      marca_id: input.marcaId,
      nome: nomeTrimmed,
      valor: input.valor,
      tem_ott: input.temOtt,
      ordem: novaOrdem,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[create-plano] erro:", error);
    return { success: false, error: "Erro ao criar plano" };
  }

  revalidatePath("/config/planos");
  revalidatePath("/atendimento");
  return { success: true, id: data.id };
}
