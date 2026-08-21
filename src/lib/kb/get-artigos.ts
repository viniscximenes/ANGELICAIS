import { createAdminClient } from "@/lib/supabase/admin";

import type { KbArtigo } from "./types";

export async function getArtigos(): Promise<KbArtigo[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("kb_artigos")
    .select(
      "id, titulo, conteudo, tags, ativo, tipo, link, data_publicacao, created_at, updated_at",
    )
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[get-artigos] erro:", error);
    return [];
  }

  return (data ?? []).map((r) => ({
    id: r.id,
    titulo: r.titulo,
    conteudo: r.conteudo,
    tags: r.tags ?? [],
    ativo: r.ativo,
    tipo: r.tipo,
    link: r.link,
    dataPublicacao: r.data_publicacao,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}
