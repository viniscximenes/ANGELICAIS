"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import {
  dedupePorContrato,
  contratosTocadosPorFaceId,
  classificarComHistoricoFaceId,
} from "@/lib/retencao/dedupe-por-contrato";
import { parseBaseRetencao } from "@/lib/retencao/parse-base-retencao";
import { salvarBaseRetencao } from "@/lib/retencao/salvar-base-retencao";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEmailPrefix } from "@/lib/utils/email-variants";
import { bucketMotivo, dataRefHojeBR, horaAtualBR, zeroBreakdown } from "../parse";
import type { ContratoItem, MotivosBreakdown } from "../types";

type UploadConsolidadoResult =
  | {
      success: true;
      rowsWritten: number;
      operadoresAtualizados: number;
      operadoresSemGestor: number;
    }
  | { success: false; error: string };

export async function uploadConsolidadoAction(
  csvText: string,
): Promise<UploadConsolidadoResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: "Não autenticado" };
  }

  if (!can(user.profile.role, "manage_d1_base")) {
    return { success: false, error: "Sem permissão para atualizar a base" };
  }

  const parseResult = parseBaseRetencao(csvText);

  console.info(
    `[upload-consolidado] parse concluído. Lidas: ${parseResult.lidas}, válidas: ${parseResult.validas}, puladas: ${parseResult.puladas}`,
  );

  if (parseResult.linhas.length === 0) {
    return { success: false, error: "Nenhuma linha válida encontrada no CSV." };
  }

  // 1. Persiste retencao_atendimentos (fonte de verdade já existente,
  // reaproveitada — mesma função usada hoje pelo fluxo de retenção).
  const dbResult = await salvarBaseRetencao(parseResult.linhas);
  if (!dbResult.success) {
    return {
      success: false,
      error: dbResult.error || "Erro ao gravar retencao_atendimentos",
    };
  }

  // 2. Agrega por operador (usuario_login), a partir das MESMAS linhas já
  // parseadas — evita reler o banco. Motivo (do cancelamento) é
  // classificado nas 6 categorias históricas do D-1, tanto pra atendimentos
  // retidos quanto cancelados.
  type Agregado = {
    email: string;
    operatorName: string;
    retidos: number;
    cancelados: number;
    motivosRetidos: MotivosBreakdown;
    motivosCancelados: MotivosBreakdown;
    contratosRetidos: ContratoItem[];
    contratosCancelados: ContratoItem[];
  };
  const porOperador = new Map<string, Agregado>();

  // CAUSA RAIZ do bug de retidos duplicados (confirmado com dados reais,
  // bruno.roberto 19/09: contrato 244309 e 949578 apareciam 3x cada em
  // contratos_retidos, inflando retidos/pedidos/tx_retencao): a base bruta
  // do Sydle/AIR tem MÚLTIPLAS LINHAS pro MESMO contrato quando há várias
  // tentativas de atendimento no mesmo dia (aborta por FaceID, tenta de
  // novo, retém no final) — sem deduplicar por (operador, cod_air) ANTES de
  // agregar, cada tentativa era contada como uma retenção/cancelamento
  // independente. Mantém só a linha final (status_hora mais recente) por
  // contrato — ver dedupe-por-contrato.ts.
  //
  // `contratosComFaceId` é construído a partir de TODAS as linhas do CSV
  // (antes do dedupe) — histórico completo do contrato, sem limite de
  // tempo/agente. Só derruba a classificação quando ela der "retido" (ver
  // classificarComHistoricoFaceId): um contrato que passou por FaceID mas
  // terminou CANCELADO conta normalmente como cancelado.
  const contratosComFaceId = contratosTocadosPorFaceId(parseResult.linhas);
  const linhasFinais = dedupePorContrato(parseResult.linhas);

  for (const linha of linhasFinais) {
    if (!linha.usuario_login) continue;
    const email = linha.usuario_login.trim().toLowerCase();
    const chave = getEmailPrefix(email);

    let agg = porOperador.get(chave);
    if (!agg) {
      agg = {
        email,
        operatorName: linha.usuario_nome?.trim() || email.split("@")[0],
        retidos: 0,
        cancelados: 0,
        motivosRetidos: zeroBreakdown(),
        motivosCancelados: zeroBreakdown(),
        contratosRetidos: [],
        contratosCancelados: [],
      };
      porOperador.set(chave, agg);
    }

    // "Abortado" (validação FaceID sem resposta) não é um desfecho de
    // retenção nem de cancelamento — fica fora de retidos/cancelados/
    // motivos/contratos e, por consequência, fora de PEDIDOS (= RETIDOS +
    // CANCELADOS) e da TX RETENÇÃO.
    const classe = classificarComHistoricoFaceId(linha, contratosComFaceId);
    if (classe === "abortado") continue;

    const bucket = bucketMotivo(linha.motivo);
    const contrato: ContratoItem = {
      contrato: linha.cod_air || "",
      cliente: linha.comprador_nome || "",
    };

    if (classe === "cancelado") {
      agg.cancelados++;
      agg.motivosCancelados[bucket]++;
      agg.contratosCancelados.push(contrato);
    } else {
      agg.retidos++;
      agg.motivosRetidos[bucket]++;
      agg.contratosRetidos.push(contrato);
    }
  }

  const admin = createAdminClient();

  // 3. Resolve gestor_id por operador via d1_operadores_gestor — mapeamento
  // global (o CSV cobre a empresa toda, não só a equipe de quem faz o
  // upload), igual à estrutura antiga de 8 abas por supervisor no Sheets.
  const { data: mapeamento, error: mapErr } = await admin
    .from("d1_operadores_gestor")
    .select("gestor_id, operador_email");

  if (mapErr) {
    console.error(
      "[upload-consolidado] erro ao buscar mapeamento de operadores por gestor:",
      mapErr.message,
    );
    return {
      success: false,
      error: "Erro ao buscar mapeamento de operadores por gestor.",
    };
  }

  const gestorPorPrefixo = new Map<string, string>();
  for (const row of mapeamento || []) {
    if (!row.operador_email) continue;
    gestorPorPrefixo.set(getEmailPrefix(row.operador_email), row.gestor_id);
  }

  const gestorIdsUnicos = Array.from(new Set(gestorPorPrefixo.values()));
  const nomeGestorPorId = new Map<string, string>();
  if (gestorIdsUnicos.length > 0) {
    const { data: gestores } = await admin
      .from("profiles")
      .select("id, full_name")
      .in("id", gestorIdsUnicos);
    for (const g of gestores || []) {
      nomeGestorPorId.set(g.id, g.full_name);
    }
  }

  // 4. Monta as linhas pra UPSERT em d1_consolidado (uma por operador
  // conhecido em d1_operadores_gestor).
  const dataRef = dataRefHojeBR();
  const reportHora = horaAtualBR();
  const rows: Record<string, unknown>[] = [];
  let operadoresSemGestor = 0;

  for (const agg of porOperador.values()) {
    const chave = getEmailPrefix(agg.email);
    const gestorId = gestorPorPrefixo.get(chave);
    if (!gestorId) {
      operadoresSemGestor++;
      continue;
    }

    // PEDIDOS = RETIDOS + CANCELADOS — "Abortado" já foi excluído do
    // agregado acima, então nunca chega aqui.
    const pedidos = agg.retidos + agg.cancelados;
    const txRetencao = pedidos > 0 ? agg.retidos / pedidos : null;

    rows.push({
      data_ref: dataRef,
      gestor_id: gestorId,
      operator_email: agg.email,
      operator_name: agg.operatorName,
      supervisor: nomeGestorPorId.get(gestorId) || "",
      retidos: agg.retidos,
      cancelados: agg.cancelados,
      pedidos,
      tx_retencao: txRetencao,
      motivos_retidos: agg.motivosRetidos,
      motivos_cancelados: agg.motivosCancelados,
      contratos_retidos: agg.contratosRetidos,
      contratos_cancelados: agg.contratosCancelados,
      report_hora: reportHora,
      report_nome_supervisor: user.profile.fullName,
    });
  }

  if (rows.length > 0) {
    const { error: upsertErr } = await admin
      .from("d1_consolidado")
      .upsert(rows, { onConflict: "data_ref,operator_email" });

    if (upsertErr) {
      console.error("[upload-consolidado] erro no upsert:", upsertErr.message);
      return {
        success: false,
        error: `Erro ao gravar d1_consolidado: ${upsertErr.message}`,
      };
    }

    // BUG DE MERGE ENTRE UPLOADS DO MESMO DIA (confirmado no código: `dataRef`
    // é sempre "hoje" — `dataRefHojeBR()` — então duas subidas de base no
    // MESMO dia caem sempre no MESMO data_ref): upsert sozinho só
    // insere/atualiza os operadores presentes NESTE upload — um operador que
    // saiu da base nova (não trabalhou, ou saiu da equipe) nunca tem sua
    // linha antiga removida, e fica "grudado" com o resultado do upload
    // anterior pra sempre, mesmo a base nova não tendo reportado nada sobre
    // ele. Corrigido replicando o padrão de "sobrescrita segura" já usado em
    // salvar-base-retencao.ts pra retencao_atendimentos: upsert primeiro
    // (nunca deixa quem SEGUE aparecendo na base sem dado visível, mesmo por
    // um instante), DEPOIS deleta só quem tinha linha em `data_ref` mas não
    // veio nesta rodada.
    const emailsDesteUpload = new Set(rows.map((r) => r.operator_email as string));

    const { data: emailsExistentes, error: existentesErr } = await admin
      .from("d1_consolidado")
      .select("operator_email")
      .eq("data_ref", dataRef);

    if (existentesErr) {
      console.error(
        "[upload-consolidado] erro ao buscar operadores existentes pra limpeza:",
        existentesErr.message,
      );
    } else {
      const emailsObsoletos = (emailsExistentes || [])
        .map((r) => r.operator_email)
        .filter((email) => !emailsDesteUpload.has(email));

      if (emailsObsoletos.length > 0) {
        const { error: deleteErr } = await admin
          .from("d1_consolidado")
          .delete()
          .eq("data_ref", dataRef)
          .in("operator_email", emailsObsoletos);

        if (deleteErr) {
          console.error(
            "[upload-consolidado] erro ao remover operadores obsoletos do dia:",
            deleteErr.message,
          );
        }
      }
    }
  }

  if (operadoresSemGestor > 0) {
    console.warn(
      `[upload-consolidado] ${operadoresSemGestor} operador(es) do CSV sem gestor cadastrado em d1_operadores_gestor — não entraram no D-1.`,
    );
  }

  revalidatePath("/reports/consolidado");

  return {
    success: true,
    rowsWritten: dbResult.rowsWritten,
    operadoresAtualizados: rows.length,
    operadoresSemGestor,
  };
}
