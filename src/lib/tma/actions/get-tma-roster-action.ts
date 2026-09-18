"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export type TmaRosterRow = { gestorId: string; operadorEmail: string };

/**
 * Roster GLOBAL (todas as equipes) de d1_operadores_gestor — payload pequeno
 * (só email + gestor_id, não o CSV), usado pelo client pra fazer o matching
 * de parte local ANTES de subir o agregado. Ver parse-tma-client.ts.
 */
export async function getTmaRosterAction(): Promise<
  { success: true; roster: TmaRosterRow[] } | { success: false; error: string }
> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_d1_base")) {
    return { success: false, error: "Sem permissão para atualizar a base" };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from("d1_operadores_gestor").select("gestor_id, operador_email");
  if (error) {
    return { success: false, error: "Erro ao buscar roster de operadores." };
  }

  const roster: TmaRosterRow[] = (data ?? [])
    .filter((r) => r.operador_email)
    .map((r) => ({ gestorId: r.gestor_id, operadorEmail: r.operador_email as string }));

  return { success: true, roster };
}
