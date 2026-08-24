"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { removerAnexo, uploadAnexo } from "../anexo";
import type { KbTipo } from "../types";

export type UpdateArtigoInput = {
  id: string;
  titulo: string;
  conteudo: string;
  palavrasChave: string[];
  tipo: KbTipo;
  link?: string;
  dataPublicacao?: string;
  anexo?: File | null;
  removerAnexo?: boolean;
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

  const { data: atual } = await adminClient
    .from("kb_artigos")
    .select("anexo_url")
    .eq("id", input.id)
    .single();
  const anexoAntigo = atual?.anexo_url ?? null;

  let novoAnexo: { path: string; tipo: string; nome: string } | null = null;
  if (input.tipo === "artigo" && input.anexo) {
    try {
      novoAnexo = await uploadAnexo(input.anexo);
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Erro ao enviar anexo",
      };
    }
  }

  const removendoAnexo = input.tipo !== "artigo" || input.removerAnexo === true;

  const update: Record<string, unknown> = {
    titulo: input.titulo.trim(),
    conteudo: input.conteudo.trim(),
    palavras_chave: input.palavrasChave,
    tipo: input.tipo,
    link: input.tipo === "artigo" ? (input.link?.trim() || null) : null,
    data_publicacao:
      input.tipo === "artigo" ? (input.dataPublicacao || null) : null,
    updated_at: new Date().toISOString(),
  };
  if (novoAnexo) {
    update.anexo_url = novoAnexo.path;
    update.anexo_tipo = novoAnexo.tipo;
    update.anexo_nome = novoAnexo.nome;
  } else if (removendoAnexo) {
    update.anexo_url = null;
    update.anexo_tipo = null;
    update.anexo_nome = null;
  }

  const { error } = await adminClient
    .from("kb_artigos")
    .update(update)
    .eq("id", input.id);

  if (error) {
    console.error("[update-artigo] erro:", error);
    if (novoAnexo) await removerAnexo(novoAnexo.path);
    return { success: false, error: "Erro ao atualizar artigo" };
  }

  // Só remove o arquivo antigo do Storage depois que o banco confirmou —
  // evita perder o anexo se a atualização falhar no meio do caminho.
  if ((novoAnexo || removendoAnexo) && anexoAntigo) {
    await removerAnexo(anexoAntigo);
  }

  revalidatePath("/config/base-conhecimento");
  return { success: true };
}
