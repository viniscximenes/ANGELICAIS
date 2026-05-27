import { createClient } from "@/lib/supabase/server";

import type { Plano } from "./types";

export async function getPlanosByMarca(marcaId: string): Promise<Plano[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("planos")
    .select("*")
    .eq("marca_id", marcaId)
    .order("ordem", { ascending: true });

  if (error) {
    console.error("[get-planos-by-marca] erro:", error);
    return [];
  }

  return (data ?? []).map((p) => ({
    id: p.id,
    marcaId: p.marca_id,
    nome: p.nome,
    valor: Number(p.valor),
    temOtt: p.tem_ott,
    isActive: p.is_active,
    ordem: p.ordem,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }));
}
