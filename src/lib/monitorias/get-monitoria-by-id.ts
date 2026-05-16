import { createClient } from "@/lib/supabase/server";

import type { Monitoria, MonitoriaWithNames } from "./types";

export async function getMonitoriaById(
  id: string,
): Promise<MonitoriaWithNames | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("monitorias")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[get-monitoria-by-id] erro:", error);
    return null;
  }

  const monitoria: Monitoria = {
    id: data.id,
    operatorEmail: data.operator_email,
    auxResponsibleEmail: data.aux_responsible_email,
    idChamada: data.id_chamada,
    contratoCliente: data.contrato_cliente,
    dataAtendimento: data.data_atendimento,
    linkOnedrive: data.link_onedrive,
    encaminhouPesquisa: data.encaminhou_pesquisa,
    sinalizacaoPrincipal: data.sinalizacao_principal,
    notaApresentacao: data.nota_apresentacao,
    notaComunicacao: data.nota_comunicacao,
    notaProcesso: data.nota_processo,
    resumoAtendimento: data.resumo_atendimento,
    status: data.status,
    finalizedAt: data.finalized_at,
    finalizedBy: data.finalized_by,
    sentAt: data.sent_at,
    sentBy: data.sent_by,
    createdAt: data.created_at,
    createdBy: data.created_by,
    updatedAt: data.updated_at,
  };

  const { data: profiles } = await supabase
    .from("profiles")
    .select("email_corporativo, full_name")
    .in("email_corporativo", [
      monitoria.operatorEmail.toLowerCase(),
      monitoria.auxResponsibleEmail.toLowerCase(),
    ]);

  const nameMap = new Map<string, string>();
  for (const p of profiles ?? []) {
    nameMap.set(p.email_corporativo.toLowerCase(), p.full_name);
  }

  return {
    ...monitoria,
    operatorName: nameMap.get(monitoria.operatorEmail.toLowerCase()) ?? null,
    auxResponsibleName:
      nameMap.get(monitoria.auxResponsibleEmail.toLowerCase()) ?? null,
  };
}
