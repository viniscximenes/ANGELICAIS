"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

import type { PausaProgramadaDb } from "../types";

/**
 * Lê a base de pausas programadas (base_pausas_programadas), ordenada por
 * e-mail do operador. Retorna [] sem permissão ou em caso de erro — quem
 * chama (a página) já fez o próprio gate de acesso.
 */
export async function getPausasProgramadas(): Promise<PausaProgramadaDb[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  if (
    !can(user.profile.role, "manage_system") &&
    !can(user.profile.role, "view_gestor_panel")
  ) {
    return [];
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("base_pausas_programadas")
    .select(
      "id, operator_email, celula, hora_login, hora_logout, descanso_1, pausa_20, descanso_2, updated_at",
    )
    .order("operator_email", { ascending: true });

  if (error) {
    console.error("[get-pausas-programadas] erro:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    operatorEmail: row.operator_email,
    celula: row.celula ?? "",
    horaLogin: row.hora_login,
    horaLogout: row.hora_logout,
    descanso1: row.descanso_1 ?? "",
    pausa20: row.pausa_20 ?? "",
    descanso2: row.descanso_2 ?? "",
    updatedAt: row.updated_at,
  }));
}
