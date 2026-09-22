"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { dataRefHojeBR, horaAtualBR } from "@/lib/d1-db/parse";
import { createAdminClient } from "@/lib/supabase/admin";
import { enforceRetentionTma } from "../enforce-retention-tma";
import type { UploadTmaPayload } from "../parse-tma-client";

type UploadTmaResult =
  | {
      success: true;
      linhasCsv: number;
      atendimentosValidos: number;
      semMatch: number;
      colisoes: number;
      operadoresAtualizados: number;
    }
  | { success: false; error: string };

const BATCH_SIZE = 2000;

async function upsertEmLotes(
  admin: ReturnType<typeof createAdminClient>,
  table: "d1_tma_atendimentos",
  rows: Record<string, unknown>[],
  onConflict: string,
): Promise<string | null> {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const lote = rows.slice(i, i + BATCH_SIZE);
    const { error } = await admin.from(table).upsert(lote, { onConflict });
    if (error) return error.message;
  }
  return null;
}

/**
 * Recebe só o agregado JÁ PROCESSADO no client (`parse-tma-client.ts`) —
 * nunca o CSV bruto. O parse + matching por parte local rodam inteiramente
 * no navegador (Web Worker); esta action só valida, estampa data_ref/report
 * e grava. Isso é o que evita o 413 em produção com arquivos de ~10MB.
 */
export async function uploadTmaAction(payload: UploadTmaPayload): Promise<UploadTmaResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Não autenticado" };
  }
  if (!can(user.profile.role, "manage_d1_base")) {
    return { success: false, error: "Sem permissão para atualizar a base" };
  }

  if (payload.agregados.length === 0) {
    return { success: false, error: "Nenhum atendimento de retenção válido encontrado no CSV." };
  }

  const admin = createAdminClient();
  const dataRef = dataRefHojeBR();
  await enforceRetentionTma(dataRef);

  const reportHora = horaAtualBR();
  const rowsAgregado: Record<string, unknown>[] = payload.agregados.map((agg) => ({
    data_ref: dataRef,
    gestor_id: agg.gestorId,
    operator_email: agg.operatorEmail,
    qtd_atendimentos: agg.qtd,
    talk_total_segundos: agg.talkTotal,
    acw_total_segundos: agg.acwTotal,
    tma_segundos: agg.qtd > 0 ? (agg.talkTotal + agg.acwTotal) / agg.qtd : null,
    talk_medio_segundos: agg.qtd > 0 ? agg.talkTotal / agg.qtd : null,
    acw_medio_segundos: agg.qtd > 0 ? agg.acwTotal / agg.qtd : null,
    qtd_outros: agg.buckets.outros,
    qtd_criticos: agg.buckets.criticos,
    qtd_mud_endereco: agg.buckets.mudEndereco,
    qtd_financeiro: agg.buckets.financeiro,
    qtd_qualidade: agg.buckets.qualidade,
    qtd_concorrencia: agg.buckets.concorrencia,
    qtd_hotline_churn: agg.buckets.hotlineChurn,
    report_hora: reportHora,
    report_nome_supervisor: user.profile.fullName,
  }));

  const { error: upsertErr } = await admin
    .from("d1_tma")
    .upsert(rowsAgregado, { onConflict: "data_ref,operator_email" });
  if (upsertErr) {
    console.error("[upload-tma] erro no upsert de d1_tma:", upsertErr.message);
    return { success: false, error: `Erro ao gravar d1_tma: ${upsertErr.message}` };
  }

  if (payload.detalhes.length > 0) {
    const detalhes = payload.detalhes.map((d) => ({
      data_ref: dataRef,
      gestor_id: d.gestorId,
      operator_email: d.operatorEmail,
      call_id: d.callId,
      call_segment_id: d.callSegmentId,
      hora: d.hora,
      telefone_cliente: d.ani,
      skill: d.skill,
      duracao_segundos: d.talkSegundos + d.acwSegundos,
      talk_segundos: d.talkSegundos,
      acw_segundos: d.acwSegundos,
    }));

    const erro = await upsertEmLotes(admin, "d1_tma_atendimentos", detalhes, "data_ref,call_segment_id");
    if (erro) {
      console.error("[upload-tma] erro no upsert de d1_tma_atendimentos:", erro);
      return { success: false, error: `Erro ao gravar d1_tma_atendimentos: ${erro}` };
    }
  }

  if (payload.semMatch > 0) {
    console.info(`[upload-tma] ${payload.semMatch} linha(s) sem operador de retenção cadastrado — ignoradas.`);
  }
  if (payload.colisoes > 0) {
    console.warn(`[upload-tma] ${payload.colisoes} linha(s) descartadas por colisão de parte local.`);
  }

  revalidatePath("/reports/tma-peso");

  return {
    success: true,
    linhasCsv: payload.linhasCsv,
    atendimentosValidos: payload.atendimentosValidos,
    semMatch: payload.semMatch,
    colisoes: payload.colisoes,
    operadoresAtualizados: rowsAgregado.length,
  };
}
