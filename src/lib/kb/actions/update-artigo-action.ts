"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { KbTipo } from "../types";

export type UpdateArtigoInput = {
  id: string;
  titulo: string;
  conteudo: string;
  tags: string[];
  tipo: KbTipo;
  link?: string;
  dataPublicacao?: string;
};

export type UpdateArtigoResult =
  | { success: true }
  | { success: false; error: string };

export async function updateArtigoAction(
  input: UpdateArtigoInput,
): Promise<UpdateArtigoResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system")) {
    return { success: false, error: "Sem permissão" };
  }

  if (!input.titulo.trim()) {
    return { success: false, error: "Título obrigatório" };
  }
  if (!input.conteudo.trim()) {
    return { success: false, error: "Conteúdo obrigatório" };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("kb_artigos")
    .update({
      titulo: input.titulo.trim(),
      conteudo: input.conteudo.trim(),
      tags: input.tags,
      tipo: input.tipo,
      link: input.tipo === "artigo" ? (input.link?.trim() || null) : null,
      data_publicacao:
        input.tipo === "artigo" ? (input.dataPublicacao || null) : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);

  if (error) {
    console.error("[update-artigo] erro:", error);
    return { success: false, error: "Erro ao atualizar artigo" };
  }

  revalidatePath("/config/base-conhecimento");
  return { success: true };
}
