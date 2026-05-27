"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export type ImportPlanosInput = {
  marcaOrigemId: string;
  marcaDestinoId: string;
  planoIds: string[];
};

export type ImportPlanosResult =
  | { success: true; count: number }
  | { success: false; error: string };

export async function importPlanosAction(
  input: ImportPlanosInput,
): Promise<ImportPlanosResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system")) {
    return { success: false, error: "Sem permissão" };
  }

  if (input.marcaOrigemId === input.marcaDestinoId) {
    return { success: false, error: "Marca de origem e destino são iguais" };
  }

  if (input.planoIds.length === 0) {
    return {
      success: false,
      error: "Selecione ao menos um plano para importar",
    };
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

  const { data: planosOrigem, error: fetchErr } = await adminClient
    .from("planos")
    .select("nome, valor, tem_ott")
    .eq("marca_id", input.marcaOrigemId)
    .in("id", input.planoIds);

  if (fetchErr || !planosOrigem) {
    console.error("[import-planos] erro ao buscar origem:", fetchErr);
    return { success: false, error: "Erro ao buscar planos de origem" };
  }

  if (planosOrigem.length === 0) {
    return { success: false, error: "Nenhum plano encontrado" };
  }

  const { data: maxOrdem } = await adminClient
    .from("planos")
    .select("ordem")
    .eq("marca_id", input.marcaDestinoId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const baseOrdem = maxOrdem?.ordem ?? 0;

  const novosPlanos = planosOrigem.map((p, i) => ({
    marca_id: input.marcaDestinoId,
    nome: p.nome,
    valor: p.valor,
    tem_ott: p.tem_ott,
    ordem: baseOrdem + i + 1,
    is_active: true,
  }));

  const { error: insertErr } = await adminClient
    .from("planos")
    .insert(novosPlanos);

  if (insertErr) {
    console.error("[import-planos] erro ao inserir:", insertErr);
    return { success: false, error: "Erro ao importar planos" };
  }

  revalidatePath("/config/planos");
  revalidatePath("/atendimento");
  return { success: true, count: novosPlanos.length };
}
