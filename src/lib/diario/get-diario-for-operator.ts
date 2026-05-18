import { createClient } from "@/lib/supabase/server";

import type { DiarioRegistro, DiarioRegistroWithName } from "./types";

function rowToRegistro(row: Record<string, unknown>): DiarioRegistro {
  return {
    id: row.id as string,
    operatorEmail: row.operator_email as string,
    caso: row.caso as DiarioRegistro["caso"],
    dataOcorrido: row.data_ocorrido as string,
    tempoLogadoSegundos: row.tempo_logado_segundos as number | null,
    tempoAJustificarSegundos: row.tempo_a_justificar_segundos as number | null,
    tempoSegundos: row.tempo_segundos as number | null,
    glpi: row.glpi as string | null,
    descricao: row.descricao as string,
    createdAt: row.created_at as string,
    createdBy: row.created_by as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * Retorna registros de um operador em um mês específico, mais recentes primeiro.
 *
 * @param operatorEmail email do operador alvo
 * @param mesRef "YYYY-MM" (ex: "2026-05")
 */
export async function getDiarioForOperator(
  operatorEmail: string,
  mesRef: string,
): Promise<DiarioRegistroWithName[]> {
  const supabase = await createClient();
  const normalizedEmail = operatorEmail.trim().toLowerCase();

  const [y, m] = mesRef.split("-").map(Number);
  const start = `${mesRef}-01`;
  const nextMonth =
    m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  const end = `${nextMonth}-01`;

  const { data, error } = await supabase
    .from("diario_registros")
    .select("*")
    .eq("operator_email", normalizedEmail)
    .gte("data_ocorrido", start)
    .lt("data_ocorrido", end)
    .order("data_ocorrido", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[get-diario-for-operator] erro:", error);
    return [];
  }

  const registros = (data ?? []).map(rowToRegistro);

  if (registros.length === 0) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("email_corporativo", normalizedEmail)
    .maybeSingle();

  return registros.map((r) => ({
    ...r,
    operatorName: profile?.full_name ?? null,
  }));
}
