import { createClient } from "@/lib/supabase/server";

import type { PlanoWithMarca } from "./types";

export async function getAllPlanosWithMarca(): Promise<PlanoWithMarca[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("planos")
    .select(
      `id, marca_id, nome, valor, tem_ott, is_active, ordem, created_at, updated_at, marca:marcas(nome)`,
    )
    .order("ordem", { ascending: true });

  if (error) {
    console.error("[get-all-planos-with-marca] erro:", error);
    return [];
  }

  return (data ?? []).map((p) => {
    // Supabase tipa o join ora como array, ora como objeto; normaliza.
    const marcaRel = p.marca as unknown as
      | { nome: string }
      | { nome: string }[]
      | null;
    const marcaNome = Array.isArray(marcaRel)
      ? (marcaRel[0]?.nome ?? "—")
      : (marcaRel?.nome ?? "—");

    return {
      id: p.id,
      marcaId: p.marca_id,
      nome: p.nome,
      valor: Number(p.valor),
      temOtt: p.tem_ott,
      isActive: p.is_active,
      ordem: p.ordem,
      marcaNome,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    };
  });
}
