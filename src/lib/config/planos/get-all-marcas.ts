import { createClient } from "@/lib/supabase/server";

import type { Marca } from "./types";

export async function getAllMarcas(): Promise<Marca[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("marcas")
    .select(
      `id, nome, is_active, created_at, updated_at, planos:planos(count)`,
    )
    .order("nome");

  if (error) {
    console.error("[get-all-marcas] erro:", error);
    return [];
  }

  return (data ?? []).map((m) => ({
    id: m.id,
    nome: m.nome,
    isActive: m.is_active,
    planosCount: Array.isArray(m.planos) ? (m.planos[0]?.count ?? 0) : 0,
    createdAt: m.created_at,
    updatedAt: m.updated_at,
  }));
}
