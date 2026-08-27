"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import type { DiaDisponivel } from "@/lib/db/types";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Lista os dias com CSV salvo em db_pausas_diario, mais recente primeiro,
 * com a contagem de linhas de cada dia. Usa a função db_pausas_dias_disponiveis
 * (GROUP BY/COUNT direto no Postgres) em vez de puxar as linhas pro app e
 * agregar em JS — um SELECT sem range() aqui esbarrava no limite padrão de
 * 1000 linhas do PostgREST/Supabase (contagem errada e dias inteiros somem
 * da lista se nenhuma linha daquele dia caísse nas primeiras 1000).
 */
export async function getDiasDisponiveisAction(): Promise<DiaDisponivel[]> {
  const user = await getCurrentUser();
  // ADM (upload/gestão) e GESTOR (seletor de dia na página DB) leem; só o
  // ADM tem manage_system, então checa os dois papéis explicitamente.
  if (
    !user ||
    (!can(user.profile.role, "manage_system", user.profile.isAdminSkill) && user.profile.role !== "GESTOR")
  ) {
    return [];
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("db_pausas_dias_disponiveis");

  if (error) {
    console.error("[get-dias-disponiveis] erro:", error.message);
    return [];
  }

  return (data ?? []).map((row: { data_ref: string; linhas: number }) => ({
    dataRef: row.data_ref,
    linhas: row.linhas,
  }));
}
