"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { formatSecondsAsHHMMSS } from "@/lib/diario/time-format";
import { gerarTexto } from "@/lib/db/gerar-texto";
import type { TemaTipo } from "@/lib/db/types";
import { createAdminClient } from "@/lib/supabase/admin";

export type FinalizarRegistroInput = {
  dataRef: string;
  agentUser: string;
  agentName: string;
  tipo: TemaTipo;
  reasonCode: string | null;
  tempoSeg: number;
  temaId: string;
};

export type FinalizarRegistroResult =
  | { success: true; textoGerado: string; temaNome: string }
  | { success: false; error: string };

export async function finalizarRegistroAction(
  input: FinalizarRegistroInput,
): Promise<FinalizarRegistroResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (user.profile.role !== "GESTOR") {
    return { success: false, error: "Sem permissão" };
  }

  const supabase = createAdminClient();

  const { data: tema, error: temaError } = await supabase
    .from("db_temas")
    .select("nome, texto_motivo")
    .eq("id", input.temaId)
    .single();

  if (temaError || !tema) {
    return { success: false, error: "Tema não encontrado" };
  }

  const textoGerado = gerarTexto({
    tipo: input.tipo,
    agentUsername: input.agentUser,
    dataRef: input.dataRef,
    reasonCode: input.reasonCode,
    duracaoSeg: input.tempoSeg,
    textoMotivo: tema.texto_motivo,
  });

  const { error } = await supabase.from("db_registros_finalizados").insert({
    data_ref: input.dataRef,
    agente_username: input.agentUser,
    agente_nome: input.agentName,
    tipo: input.tipo,
    reason_code: input.reasonCode,
    duracao: formatSecondsAsHHMMSS(input.tempoSeg),
    tema_nome: tema.nome,
    texto_gerado: textoGerado,
    gestor_id: user.profile.id,
  });

  if (error) {
    console.error("[finalizar-registro] erro:", error.message);
    return { success: false, error: "Erro ao salvar registro" };
  }

  revalidatePath("/gestor/db");
  return { success: true, textoGerado, temaNome: tema.nome };
}
