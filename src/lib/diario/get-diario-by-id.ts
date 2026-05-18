import { createClient } from "@/lib/supabase/server";

import type { DiarioRegistro } from "./types";

export async function getDiarioById(
  id: string,
): Promise<DiarioRegistro | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("diario_registros")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[get-diario-by-id] erro:", error);
    return null;
  }

  return {
    id: data.id,
    operatorEmail: data.operator_email,
    caso: data.caso,
    dataOcorrido: data.data_ocorrido,
    tempoLogadoSegundos: data.tempo_logado_segundos,
    tempoAJustificarSegundos: data.tempo_a_justificar_segundos,
    tempoSegundos: data.tempo_segundos,
    glpi: data.glpi,
    descricao: data.descricao,
    createdAt: data.created_at,
    createdBy: data.created_by,
    updatedAt: data.updated_at,
  };
}
