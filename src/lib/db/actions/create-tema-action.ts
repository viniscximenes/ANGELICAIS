"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import type { TemaTipo } from "@/lib/db/types";
import { createAdminClient } from "@/lib/supabase/admin";

export type CreateTemaResult =
  | { success: true; id: string }
  | { success: false; error: string };

export async function createTemaAction(input: {
  tipo: TemaTipo;
  nome: string;
  textoMotivo: string;
}): Promise<CreateTemaResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system")) {
    return { success: false, error: "Sem permissão" };
  }

  const nome = input.nome.trim();
  const textoMotivo = input.textoMotivo.trim();
  if (!nome) return { success: false, error: "Nome é obrigatório" };
  if (!textoMotivo) {
    return { success: false, error: "Texto do motivo é obrigatório" };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("db_temas")
    .insert({ tipo: input.tipo, nome, texto_motivo: textoMotivo })
    .select("id")
    .single();

  if (error) {
    console.error("[create-tema] erro:", error.message);
    return { success: false, error: "Erro ao criar tema" };
  }

  revalidatePath("/config/db");
  return { success: true, id: data.id };
}
