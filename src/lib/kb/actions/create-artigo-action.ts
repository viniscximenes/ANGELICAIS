"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { removerAnexo, uploadAnexo } from "../anexo";
import type { KbTipo } from "../types";

export type CreateArtigoInput = {
  titulo: string;
  conteudo: string;
  palavrasChave: string[];
  tipo: KbTipo;
  link?: string;
  dataPublicacao?: string;
  anexo?: File | null;
};

export type CreateArtigoResult =
  | { success: true }
  | { success: false; error: string };

export async function createArtigoAction(
  input: CreateArtigoInput,
): Promise<CreateArtigoResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system", user.profile.isAdminSkill)) {
    return { success: false, error: "Sem permissão" };
  }

  if (!input.titulo.trim()) {
    return { success: false, error: "Título obrigatório" };
  }
  if (!input.conteudo.trim()) {
    return { success: false, error: "Conteúdo obrigatório" };
  }

  let anexo: { path: string; tipo: string; nome: string } | null = null;
  if (input.tipo === "artigo" && input.anexo) {
    try {
      anexo = await uploadAnexo(input.anexo);
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Erro ao enviar anexo",
      };
    }
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.from("kb_artigos").insert({
    titulo: input.titulo.trim(),
    conteudo: input.conteudo.trim(),
    palavras_chave: input.palavrasChave,
    tipo: input.tipo,
    link: input.tipo === "artigo" ? (input.link?.trim() || null) : null,
    data_publicacao:
      input.tipo === "artigo" ? (input.dataPublicacao || null) : null,
    anexo_url: anexo?.path ?? null,
    anexo_tipo: anexo?.tipo ?? null,
    anexo_nome: anexo?.nome ?? null,
  });

  if (error) {
    console.error("[create-artigo] erro:", error);
    if (anexo) await removerAnexo(anexo.path);
    return { success: false, error: "Erro ao criar artigo" };
  }

  revalidatePath("/config/base-conhecimento");
  return { success: true };
}
