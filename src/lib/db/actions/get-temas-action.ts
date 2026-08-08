"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import type { Tema, TemaTipo } from "@/lib/db/types";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getTemasAction(tipo: TemaTipo): Promise<Tema[]> {
  const user = await getCurrentUser();
  // ADM (config) e GESTOR (dropdown de tema na página DB) leem; só o ADM
  // tem manage_system, então checa os dois papéis explicitamente.
  if (
    !user ||
    (!can(user.profile.role, "manage_system") && user.profile.role !== "GESTOR")
  ) {
    return [];
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("db_temas")
    .select("id, tipo, nome, texto_motivo")
    .eq("tipo", tipo)
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error) {
    console.error("[get-temas] erro:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    tipo: row.tipo as TemaTipo,
    nome: row.nome,
    textoMotivo: row.texto_motivo,
  }));
}

/**
 * true se não houver NENHUM tema cadastrado (nenhum tipo) — usado pra
 * decidir se oferece o botão "Carregar temas padrão".
 */
export async function getTemasVazioAction(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user || !can(user.profile.role, "manage_system")) return false;

  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("db_temas")
    .select("id", { count: "exact", head: true });

  if (error) {
    console.error("[get-temas-vazio] erro:", error.message);
    return false;
  }

  return (count ?? 0) === 0;
}
