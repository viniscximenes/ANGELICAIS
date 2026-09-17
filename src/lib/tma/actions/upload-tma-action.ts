"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { dataRefHojeBR, horaAtualBR } from "@/lib/d1-db/parse";
import { createAdminClient } from "@/lib/supabase/admin";
import { enforceRetentionTma } from "../enforce-retention-tma";
import { parseTma } from "../parse-tma";
import { bucketDaSkill, zeroSkillBuckets, type SkillBucket } from "../skills-retencao";

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

export async function uploadTmaAction(csvText: string): Promise<UploadTmaResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Não autenticado" };
  }
  if (!can(user.profile.role, "manage_d1_base")) {
    return { success: false, error: "Sem permissão para atualizar a base" };
  }

  const { linhas, lidas } = parseTma(csvText);

  if (linhas.length === 0) {
    return { success: false, error: "Nenhum atendimento de retenção válido encontrado no CSV." };
  }

  const admin = createAdminClient();

  // Roster GLOBAL (todas as equipes) — o CDR cobre a empresa toda, cada
  // linha é resolvida pro gestor dono do operador, igual ao upload do
  // Consolidado.
  const { data: roster, error: rosterErr } = await admin
    .from("d1_operadores_gestor")
    .select("gestor_id, operador_email");

  if (rosterErr) {
    console.error("[upload-tma] erro ao buscar roster:", rosterErr.message);
    return { success: false, error: "Erro ao buscar roster de operadores." };
  }

  // parte local (lowercase) -> lista de {gestor_id, operador_email} cadastrados.
  // Mais de um operador distinto com a mesma parte local = colisão (defensivo).
  const porParteLocal = new Map<string, { gestorId: string; operadorEmail: string }[]>();
  for (const row of roster || []) {
    if (!row.operador_email) continue;
    const parteLocal = row.operador_email.trim().toLowerCase().split("@")[0];
    const email = row.operador_email.trim().toLowerCase();
    const lista = porParteLocal.get(parteLocal) ?? [];
    if (!lista.some((r) => r.operadorEmail === email)) {
      lista.push({ gestorId: row.gestor_id, operadorEmail: email });
    }
    porParteLocal.set(parteLocal, lista);
  }

  type Agregado = {
    gestorId: string;
    operatorEmail: string;
    qtd: number;
    talkTotal: number;
    acwTotal: number;
    buckets: Record<SkillBucket, number>;
  };
  const porOperador = new Map<string, Agregado>();
  const detalhes: Record<string, unknown>[] = [];

  let semMatch = 0;
  let colisoes = 0;

  for (const linha of linhas) {
    const candidatos = porParteLocal.get(linha.emailLocal);
    if (!candidatos || candidatos.length === 0) {
      semMatch++;
      continue;
    }
    if (candidatos.length > 1) {
      colisoes++;
      console.warn(
        `[upload-tma] colisão de parte local "${linha.emailLocal}" entre operadores cadastrados — linha descartada.`,
      );
      continue;
    }

    const { gestorId, operadorEmail } = candidatos[0];

    let agg = porOperador.get(operadorEmail);
    if (!agg) {
      agg = {
        gestorId,
        operatorEmail: operadorEmail,
        qtd: 0,
        talkTotal: 0,
        acwTotal: 0,
        buckets: zeroSkillBuckets(),
      };
      porOperador.set(operadorEmail, agg);
    }
    agg.qtd += 1;
    agg.talkTotal += linha.talkSegundos;
    agg.acwTotal += linha.acwSegundos;
    const bucket = bucketDaSkill(linha.skill);
    if (bucket) agg.buckets[bucket] += 1;

    detalhes.push({
      data_ref: dataRefHojeBR(),
      gestor_id: gestorId,
      operator_email: operadorEmail,
      call_id: linha.callId,
      call_segment_id: linha.callSegmentId,
      hora: linha.hora,
      telefone_cliente: linha.ani,
      skill: linha.skill,
      duracao_segundos: linha.talkSegundos + linha.acwSegundos,
      talk_segundos: linha.talkSegundos,
      acw_segundos: linha.acwSegundos,
    });
  }

  const dataRef = dataRefHojeBR();
  await enforceRetentionTma(dataRef);

  const reportHora = horaAtualBR();
  const rowsAgregado: Record<string, unknown>[] = Array.from(porOperador.values()).map((agg) => ({
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

  if (rowsAgregado.length > 0) {
    const { error: upsertErr } = await admin
      .from("d1_tma")
      .upsert(rowsAgregado, { onConflict: "data_ref,operator_email" });
    if (upsertErr) {
      console.error("[upload-tma] erro no upsert de d1_tma:", upsertErr.message);
      return { success: false, error: `Erro ao gravar d1_tma: ${upsertErr.message}` };
    }
  }

  if (detalhes.length > 0) {
    const erro = await upsertEmLotes(
      admin,
      "d1_tma_atendimentos",
      detalhes,
      "data_ref,call_segment_id",
    );
    if (erro) {
      console.error("[upload-tma] erro no upsert de d1_tma_atendimentos:", erro);
      return { success: false, error: `Erro ao gravar d1_tma_atendimentos: ${erro}` };
    }
  }

  if (semMatch > 0) {
    console.info(`[upload-tma] ${semMatch} linha(s) sem operador de retenção cadastrado — ignoradas.`);
  }
  if (colisoes > 0) {
    console.warn(`[upload-tma] ${colisoes} linha(s) descartadas por colisão de parte local.`);
  }

  revalidatePath("/reports/tma");

  return {
    success: true,
    linhasCsv: lidas,
    atendimentosValidos: linhas.length,
    semMatch,
    colisoes,
    operadoresAtualizados: rowsAgregado.length,
  };
}
