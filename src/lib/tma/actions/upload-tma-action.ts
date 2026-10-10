"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { dataRefHojeBR, horaAtualBR } from "@/lib/d1-db/parse";
import { createAdminClient } from "@/lib/supabase/admin";
import { enforceRetentionTma } from "../enforce-retention-tma";
import type { DetalheTmaPayload, UploadTmaPayload } from "../parse-tma-client";
import { bucketDaSkill, isSkillRetencao, zeroSkillBuckets, type SkillBucket } from "../skills-retencao";

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

/** Teto de atendimentos por envio — o mesmo número dito no aria-label do TmaUploadDropzone. */
const MAX_LINHAS_CSV = 50_000;

/** Teto de uma duração (TALK/ACW) em segundos: 24h. Acima disso é dado corrompido. */
const MAX_SEGUNDOS = 86_400;

/** Mensagem genérica pro cliente: o erro cru do banco fica só no log do servidor. */
const ERRO_GRAVAR_BASE = "Não foi possível gravar a base. Tente novamente.";

/** Payload fora do formato que o parse do client produz (bug ou adulteração). */
const ERRO_PAYLOAD_INVALIDO = "Dados do arquivo inválidos — a base não foi alterada. Recarregue a página e tente de novo.";

// Hora da coluna TIME do CSV como veio (hoje sempre "HH:MM:SS"); aceita
// hora com 1 dígito pra não recusar um arquivo inteiro por formatação.
const HORA_RE = /^\d{1,2}:\d{2}:\d{2}$/;
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;

function contadorValido(v: unknown): v is number {
  return typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
}

function segundosValidos(v: unknown, minimo: number): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= minimo && v <= MAX_SEGUNDOS;
}

function textoOpcionalValido(v: unknown, maxLen: number): v is string | null {
  return v === null || (typeof v === "string" && v.length <= maxLen);
}

/**
 * Server Action é um endpoint público: o tipo do TS não chega em runtime.
 * Confere cada atendimento contra o formato que parse-tma-client.ts produz
 * (mesmas regras de linha válida de parse-tma.ts) — qualquer item fora disso
 * recusa o envio inteiro, como o upload do Consolidado faz com linha inválida.
 */
function detalheValido(d: unknown): d is DetalheTmaPayload {
  if (typeof d !== "object" || d === null) return false;
  const x = d as Record<string, unknown>;
  return (
    typeof x.operatorEmail === "string" &&
    x.operatorEmail.length <= 254 &&
    x.operatorEmail.indexOf("@") > 0 &&
    textoOpcionalValido(x.callId, 100) &&
    textoOpcionalValido(x.callSegmentId, 100) &&
    textoOpcionalValido(x.ani, 40) &&
    (x.hora === null || (typeof x.hora === "string" && HORA_RE.test(x.hora))) &&
    typeof x.skill === "string" &&
    x.skill.length <= 200 &&
    isSkillRetencao(x.skill) &&
    segundosValidos(x.talkSegundos, 1) &&
    segundosValidos(x.acwSegundos, 0)
  );
}

/**
 * Recebe os atendimentos JÁ PARSEADOS no client (`parse-tma-client.ts`) —
 * nunca o CSV bruto. O parse roda no navegador (Web Worker); esta action
 * valida cada atendimento, resolve o gestor de cada operador pelo roster do
 * BANCO (d1_operadores_gestor), recalcula o agregado por operador e grava.
 * Isso é o que evita o 413 em produção com arquivos de ~10MB.
 *
 * Nada do que define ONDE e QUANTO se grava vem do cliente: gestor_id sai
 * do roster lido aqui (mesmo mapeamento global do upload do Consolidado) e
 * os totais de d1_tma são somados aqui a partir dos atendimentos validados.
 *
 * RISCO-ACEITO: quem tem manage_d1_base pode enviar atendimentos fabricados (forjando o CSV) para operadores de qualquer equipe do roster.
 * Motivo: o parse do CSV (~10MB no dia cheio) roda no navegador porque enviar o arquivo bruto estoura o limite de payload da Server Action (413 em produção); o servidor não vê o arquivo original pra conferir.
 * Mitigação: gestor_id vem só do roster do banco, cada atendimento é validado (skill de retenção, durações, formatos, teto de linhas), os totais são recalculados aqui e report_nome_supervisor registra quem enviou.
 * Revisar quando: o upload passar a mandar o arquivo direto pro Storage (upload assinado) e o parse puder rodar no servidor.
 */
export async function uploadTmaAction(payload: UploadTmaPayload): Promise<UploadTmaResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Não autenticado" };
  }
  if (!can(user.profile.role, "manage_d1_base")) {
    return { success: false, error: "Sem permissão para atualizar a base" };
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    !Array.isArray(payload.detalhes) ||
    !contadorValido(payload.linhasCsv) ||
    !contadorValido(payload.atendimentosValidos) ||
    !contadorValido(payload.semMatch) ||
    !contadorValido(payload.colisoes)
  ) {
    return { success: false, error: ERRO_PAYLOAD_INVALIDO };
  }

  if (payload.detalhes.length === 0) {
    return { success: false, error: "Nenhum atendimento de retenção válido encontrado no CSV." };
  }

  // Mesmo limite anunciado na área de anexo (TmaUploadDropzone, aria-label)
  // — antes só existia no texto. O dia cheio do polo tem ~3 mil
  // atendimentos; o teto só barra arquivo errado/gigante antes de gravar.
  if (payload.detalhes.length > MAX_LINHAS_CSV) {
    return {
      success: false,
      error: `O arquivo tem ${payload.detalhes.length.toLocaleString("pt-BR")} atendimentos — o limite é ${MAX_LINHAS_CSV.toLocaleString("pt-BR")}.`,
    };
  }

  if (!payload.detalhes.every(detalheValido)) {
    return { success: false, error: ERRO_PAYLOAD_INVALIDO };
  }

  const admin = createAdminClient();

  // Roster global (o CSV cobre o polo inteiro, não só a equipe de quem faz
  // o upload) — mesma leitura do upload do Consolidado. É a ÚNICA fonte do
  // gestor_id gravado: e-mail fora do roster é descartado.
  const { data: mapeamento, error: mapErr } = await admin
    .from("d1_operadores_gestor")
    .select("gestor_id, operador_email");

  if (mapErr) {
    console.error("[upload-tma] erro ao buscar mapeamento de operadores por gestor:", mapErr.message);
    return { success: false, error: "Erro ao buscar mapeamento de operadores por gestor." };
  }

  // E-mail cadastrado em mais de uma equipe fica sem gestor (null): não dá
  // pra saber em qual time gravar. Hoje não acontece (conferido no banco).
  const gestorPorEmail = new Map<string, string | null>();
  for (const row of mapeamento ?? []) {
    if (!row.operador_email) continue;
    const email = row.operador_email.trim().toLowerCase();
    const atual = gestorPorEmail.get(email);
    gestorPorEmail.set(email, atual === undefined || atual === row.gestor_id ? row.gestor_id : null);
  }

  type Agregado = {
    gestorId: string;
    qtd: number;
    talkTotal: number;
    acwTotal: number;
    buckets: Record<SkillBucket, number>;
  };
  const porOperador = new Map<string, Agregado>();
  const detalhes: Record<string, unknown>[] = [];
  let semGestorNoServidor = 0;
  let colisoesNoServidor = 0;

  const dataRef = dataRefHojeBR();

  // O mesmo segmento (call_segment_id) duas vezes no arquivo violaria o
  // único (data_ref, call_segment_id) e derrubaria o envio inteiro na
  // função do banco — fica a última ocorrência, antes de somar, pra tabela
  // e Analítico contarem o mesmo atendimento uma vez só.
  const ultimoPorSegmento = new Map<string, DetalheTmaPayload>();
  const semSegmento: DetalheTmaPayload[] = [];
  for (const d of payload.detalhes) {
    if (d.callSegmentId === null) semSegmento.push(d);
    else ultimoPorSegmento.set(d.callSegmentId, d);
  }

  for (const d of [...ultimoPorSegmento.values(), ...semSegmento]) {
    const email = d.operatorEmail.trim().toLowerCase();
    const gestorId = gestorPorEmail.get(email);
    if (gestorId === undefined) {
      semGestorNoServidor++;
      continue;
    }
    if (gestorId === null) {
      colisoesNoServidor++;
      continue;
    }

    let agg = porOperador.get(email);
    if (!agg) {
      agg = { gestorId, qtd: 0, talkTotal: 0, acwTotal: 0, buckets: zeroSkillBuckets() };
      porOperador.set(email, agg);
    }
    agg.qtd += 1;
    agg.talkTotal += d.talkSegundos;
    agg.acwTotal += d.acwSegundos;
    const bucket = bucketDaSkill(d.skill);
    if (bucket) agg.buckets[bucket] += 1;

    detalhes.push({
      data_ref: dataRef,
      gestor_id: gestorId,
      operator_email: email,
      call_id: d.callId,
      call_segment_id: d.callSegmentId,
      hora: d.hora,
      telefone_cliente: d.ani,
      skill: d.skill,
      duracao_segundos: d.talkSegundos + d.acwSegundos,
      talk_segundos: d.talkSegundos,
      acw_segundos: d.acwSegundos,
    });
  }

  // Nenhum operador do envio mapeado a gestor: nada seria gravado e a tela
  // mostraria "concluído" sem mudar nada. Mesma mensagem do Consolidado.
  if (porOperador.size === 0) {
    return {
      success: false,
      error:
        "Nenhum operador do CSV está vinculado a um gestor — a base não foi alterada. Confira se o arquivo é a base certa.",
    };
  }

  await enforceRetentionTma(dataRef);

  const reportHora = horaAtualBR();
  // Dias da base colada (coluna DATE, extraída no client) — cabeçalho do
  // report, igual ao Consolidado. Vem do client: só aceita YYYY-MM-DD.
  const reportDatasBase = Array.isArray(payload.datasBase)
    ? payload.datasBase.filter((d) => typeof d === "string" && DATA_RE.test(d)).slice(0, 62)
    : [];
  const rowsAgregado: Record<string, unknown>[] = Array.from(porOperador, ([email, agg]) => ({
    data_ref: dataRef,
    gestor_id: agg.gestorId,
    operator_email: email,
    qtd_atendimentos: agg.qtd,
    talk_total_segundos: agg.talkTotal,
    acw_total_segundos: agg.acwTotal,
    tma_segundos: (agg.talkTotal + agg.acwTotal) / agg.qtd,
    talk_medio_segundos: agg.talkTotal / agg.qtd,
    acw_medio_segundos: agg.acwTotal / agg.qtd,
    qtd_outros: agg.buckets.outros,
    qtd_criticos: agg.buckets.criticos,
    qtd_mud_endereco: agg.buckets.mudEndereco,
    qtd_financeiro: agg.buckets.financeiro,
    qtd_qualidade: agg.buckets.qualidade,
    qtd_concorrencia: agg.buckets.concorrencia,
    qtd_hotline_churn: agg.buckets.hotlineChurn,
    report_hora: reportHora,
    report_nome_supervisor: user.profile.fullName,
    report_datas_base: reportDatasBase.length > 0 ? reportDatasBase : null,
  }));

  // Grava tudo numa transação só (função substituir_base_tma,
  // scripts/sql/upload-tma-atomico.sql) — mesmo padrão do upload do
  // Consolidado: troca os atendimentos do dia, faz o upsert em d1_tma e
  // remove do dia quem não veio neste upload. Ou grava tudo, ou nada — antes
  // eram requests separados e uma falha no meio deixava a tabela e o
  // Analítico com bases diferentes. A função também pega o mesmo advisory
  // lock do "Limpar Base": um espera o outro terminar.
  //
  // RISCO-ACEITO: um CSV com só parte da operação (ex.: uma equipe) apaga as linhas de hoje de todas as outras equipes.
  // Motivo: decisão do usuário (2026-10-09) — a base é única/compartilhada e cada upload deve ser a base completa do dia, como no Consolidado.
  // Mitigação: lote sem nenhum operador mapeado é recusado (aqui e na função do banco); a base fica salva no sistema externo e basta colar a completa de novo.
  // Revisar quando: houver upload por equipe, ou a base deixar de ser exportada inteira (regra no Supabase: substituir_base_tma, scripts/sql/upload-tma-atomico.sql).
  const { error: rpcErr } = await admin.rpc("substituir_base_tma", {
    p_tma: rowsAgregado,
    p_atendimentos: detalhes,
    p_data_ref: dataRef,
  });
  if (rpcErr) {
    console.error("[upload-tma] erro ao gravar a base:", rpcErr.message);
    return { success: false, error: ERRO_GRAVAR_BASE };
  }

  // Contadores do client só entram no resumo/log; os descartes feitos aqui
  // (roster mudou entre o parse e o envio) somam aos do client.
  const semMatch = payload.semMatch + semGestorNoServidor;
  const colisoes = payload.colisoes + colisoesNoServidor;

  if (semMatch > 0) {
    console.info(`[upload-tma] ${semMatch} linha(s) sem operador de retenção cadastrado — ignoradas.`);
  }
  if (colisoes > 0) {
    console.warn(`[upload-tma] ${colisoes} linha(s) descartadas por colisão de parte local.`);
  }

  // Sem revalidatePath (mesmo do upload do Consolidado): o TmaUploadDropzone
  // (único chamador) faz window.location.reload() logo depois — revalidar só
  // refazia a página dentro da resposta pra ela ser jogada fora pelo reload.

  return {
    success: true,
    linhasCsv: payload.linhasCsv,
    atendimentosValidos: payload.atendimentosValidos,
    semMatch,
    colisoes,
    operadoresAtualizados: rowsAgregado.length,
  };
}
