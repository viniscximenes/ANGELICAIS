import { createClient } from "@/lib/supabase/server";

import type { Monitoria, MonitoriaWithNames } from "./types";

function rowToMonitoria(row: Record<string, unknown>): Monitoria {
  return {
    id: row.id as string,
    operatorEmail: row.operator_email as string,
    auxResponsibleEmail: row.aux_responsible_email as string,
    idChamada: row.id_chamada as string,
    contratoCliente: row.contrato_cliente as string,
    dataAtendimento: row.data_atendimento as string,
    linkOnedrive: row.link_onedrive as string,
    encaminhouPesquisa: row.encaminhou_pesquisa as boolean | null,
    sinalizacaoPrincipal:
      row.sinalizacao_principal as Monitoria["sinalizacaoPrincipal"],
    notaApresentacao: row.nota_apresentacao as Monitoria["notaApresentacao"],
    notaComunicacao: row.nota_comunicacao as Monitoria["notaComunicacao"],
    notaProcesso: row.nota_processo as Monitoria["notaProcesso"],
    resumoAtendimento: row.resumo_atendimento as string | null,
    status: row.status as Monitoria["status"],
    finalizedAt: row.finalized_at as string | null,
    finalizedBy: row.finalized_by as string | null,
    sentAt: row.sent_at as string | null,
    sentBy: row.sent_by as string | null,
    createdAt: row.created_at as string,
    createdBy: row.created_by as string,
    updatedAt: row.updated_at as string,
  };
}

async function enrichWithNames(
  monitorias: Monitoria[],
): Promise<MonitoriaWithNames[]> {
  if (monitorias.length === 0) return [];

  const supabase = await createClient();
  const emails = Array.from(
    new Set([
      ...monitorias.map((m) => m.operatorEmail.toLowerCase()),
      ...monitorias.map((m) => m.auxResponsibleEmail.toLowerCase()),
    ]),
  );

  const { data } = await supabase
    .from("profiles")
    .select("email_corporativo, full_name")
    .in("email_corporativo", emails);

  const nameMap = new Map<string, string>();
  for (const p of data ?? []) {
    nameMap.set(p.email_corporativo.toLowerCase(), p.full_name);
  }

  return monitorias.map((m) => ({
    ...m,
    operatorName: nameMap.get(m.operatorEmail.toLowerCase()) ?? null,
    auxResponsibleName:
      nameMap.get(m.auxResponsibleEmail.toLowerCase()) ?? null,
  }));
}

/**
 * Todas as monitorias do banco, mais recentes primeiro. Apenas ADM
 * tem RLS pra ler tudo.
 */
export async function getMonitoriasForAdmin(): Promise<MonitoriaWithNames[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("monitorias")
    .select("*")
    .order("data_atendimento", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[get-monitorias-for-admin] erro:", error);
    return [];
  }

  const monitorias = (data ?? []).map(rowToMonitoria);
  return enrichWithNames(monitorias);
}
