"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getRangeDoMes } from "@/lib/db/mes-range";
import type { MesSelecionado, RegistroFinalizado, TemaTipo } from "@/lib/db/types";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getFinalizadosAction(
  mes: MesSelecionado,
): Promise<RegistroFinalizado[]> {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "GESTOR") return [];

  const { inicio, fimExclusivo } = getRangeDoMes(mes);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("db_registros_finalizados")
    .select(
      "id, data_ref, agente_username, agente_nome, tipo, reason_code, duracao, tema_nome, texto_gerado",
    )
    .eq("gestor_id", user.profile.id)
    .gte("data_ref", inicio)
    .lt("data_ref", fimExclusivo)
    .order("data_ref", { ascending: true })
    .order("agente_username", { ascending: true });

  if (error) {
    console.error("[get-finalizados] erro:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    dataRef: row.data_ref,
    agentUsername: row.agente_username,
    agentNome: row.agente_nome ?? row.agente_username,
    tipo: row.tipo as TemaTipo,
    reasonCode: row.reason_code,
    duracao: row.duracao,
    temaNome: row.tema_nome,
    textoGerado: row.texto_gerado,
  }));
}
