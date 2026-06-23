"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

export type OperadorNomeEntry = {
  email: string;
  nomeFantasia: string;
};

export type SaveNomeFantasiaResult =
  | { success: true }
  | { success: false; error: string; camposFaltando?: string[] };

export async function saveNomeFantasiaAction(
  ativo: boolean,
  lista: OperadorNomeEntry[],
): Promise<SaveNomeFantasiaResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  if (user.profile.role !== "GESTOR") {
    return { success: false, error: "Sem permissão" };
  }

  // gestorId always from server — not trusted from client
  const gestorId = user.profile.id;

  if (ativo) {
    const camposFaltando = lista
      .filter((op) => !op.nomeFantasia.trim())
      .map((op) => op.email);

    if (camposFaltando.length > 0) {
      return {
        success: false,
        error: "Preencha o nome fantasia de todos os operadores",
        camposFaltando,
      };
    }
  }

  const supabase = await createClient();

  const { error: configError } = await supabase
    .from("gestor_config_fantasia")
    .upsert({ gestor_id: gestorId, ativo }, { onConflict: "gestor_id" });

  if (configError) {
    console.error("[saveNomeFantasia] erro config:", configError);
    return { success: false, error: "Erro ao salvar configuração" };
  }

  const rows = lista
    .filter((op) => op.email.trim())
    .map((op) => ({
      gestor_id: gestorId,
      operador_email: op.email.trim().toLowerCase(),
      nome_fantasia: op.nomeFantasia.trim(),
    }));

  if (rows.length > 0) {
    const { error: nomesError } = await supabase
      .from("operador_nome_fantasia")
      .upsert(rows, { onConflict: "gestor_id,operador_email" });

    if (nomesError) {
      console.error("[saveNomeFantasia] erro nomes:", nomesError);
      return { success: false, error: "Erro ao salvar nomes fantasia" };
    }
  }

  revalidatePath("/configuracoes/operadores");

  return { success: true };
}
