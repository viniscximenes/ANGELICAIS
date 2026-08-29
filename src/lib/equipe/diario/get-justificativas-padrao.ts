import { createClient } from "@/lib/supabase/server";

/**
 * Textos prontos ("presets") do campo de justificativa da linha de Tempo
 * Logado em /operacao/diario. Vêm da tabela equipe_diario_justificativas_padrao
 * (RLS liberado para authenticated), ordenados por display_order ASC.
 *
 * Só leitura — o gestor pode editar o texto livremente depois de escolher.
 */

export type JustificativaPadrao = {
  id: string;
  texto: string;
};

export async function getJustificativasPadrao(): Promise<JustificativaPadrao[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("equipe_diario_justificativas_padrao")
    .select("id, texto, display_order")
    .order("display_order", { ascending: true });

  if (error) {
    console.error("[getJustificativasPadrao] erro:", error.message);
    return [];
  }

  return (data ?? [])
    .filter((row): row is { id: string; texto: string; display_order: number } =>
      Boolean(row?.texto),
    )
    .map((row) => ({ id: String(row.id), texto: row.texto }));
}
