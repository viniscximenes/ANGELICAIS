import { createAdminClient } from "@/lib/supabase/admin";
import { getAnexoUrlAssinada } from "./anexo";

import type { KbArtigo } from "./types";

export async function getArtigos(): Promise<KbArtigo[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("kb_artigos")
    .select(
      "id, titulo, conteudo, palavras_chave, ativo, tipo, link, data_publicacao, created_at, updated_at, anexo_url, anexo_tipo, anexo_nome",
    )
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[get-artigos] erro:", error);
    return [];
  }

  return Promise.all(
    (data ?? []).map(async (r) => ({
      id: r.id,
      titulo: r.titulo,
      conteudo: r.conteudo,
      palavrasChave: r.palavras_chave ?? [],
      ativo: r.ativo,
      tipo: r.tipo,
      link: r.link,
      dataPublicacao: r.data_publicacao,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      anexoPath: r.anexo_url,
      anexoTipo: r.anexo_tipo,
      anexoNome: r.anexo_nome,
      anexoUrlAssinada: await getAnexoUrlAssinada(r.anexo_url),
    })),
  );
}
