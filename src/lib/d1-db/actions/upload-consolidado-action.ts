"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { dedupePorContrato } from "@/lib/retencao/dedupe-por-contrato";
import { classificarAtendimento } from "@/lib/retencao/classificar-atendimento";
import { parseBaseRetencao } from "@/lib/retencao/parse-base-retencao";
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

/** Teto de linhas do CSV — o mesmo número dito no aria-label do UploadDropzone. */
const MAX_LINHAS_CSV = 10_000;

/** Mensagem genérica pro cliente: o erro cru do banco fica só no log do servidor. */
const ERRO_GRAVAR_BASE = "Não foi possível gravar a base. Tente novamente.";

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

  if (typeof csvText !== "string" || csvText.trim() === "") {
    return { success: false, error: "Arquivo vazio ou inválido." };
  }

  const parseResult = parseBaseRetencao(csvText);

  console.info(
    `[upload-consolidado] parse concluído. Lidas: ${parseResult.lidas}, válidas: ${parseResult.validas}, puladas: ${parseResult.puladas}`,
  );

  if (parseResult.linhas.length === 0) {
    return { success: false, error: "Nenhuma linha válida encontrada no CSV." };
  }

  // Mesmo limite anunciado na área de anexo (UploadDropzone, aria-label) —
  // antes só existia no texto. A base do dia tem ~2 mil linhas; o teto só
  // barra arquivo errado/gigante antes de gravar no banco.
  if (parseResult.linhas.length > MAX_LINHAS_CSV) {
    return {
      success: false,
      error: `O arquivo tem ${parseResult.linhas.length.toLocaleString("pt-BR")} linhas — o limite é ${MAX_LINHAS_CSV.toLocaleString("pt-BR")}.`,
    };
  }

  // 1. Agrega por operador (usuario_login), a partir das MESMAS linhas já
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
  // (operador, contrato) — ver dedupe-por-contrato.ts. Chave por operador +
  // contrato: se dois operadores diferentes retêm o mesmo contrato no
  // mesmo dia, cada um conta a sua própria linha final separadamente.
  //
  // Classificação puramente por linha, sem histórico cross-operador/
  // cross-equipe (mudança de regra de negócio: a checagem por
  // `primeiro_nivel = "FaceID"` deixou de ser critério de exclusão).
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
    const classe = classificarAtendimento(linha);
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

  // 2. Resolve gestor_id por operador via d1_operadores_gestor — mapeamento
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

  // 3. Monta as linhas de d1_consolidado (uma por operador conhecido em
  // d1_operadores_gestor).
  const dataRef = dataRefHojeBR();
  const reportHora = horaAtualBR();
  // Dias da base colada (status_hora já vem como "YYYY-MM-DDTHH:mm:ss-03:00",
  // ou seja, a data no fuso de Brasília são os 10 primeiros caracteres) —
  // mostrados no cabeçalho do report, porque um gestor pode colar a base de
  // outra data e a atualização vale pra todos.
  const reportDatasBase = Array.from(
    new Set(
      parseResult.linhas
        .map((linha) => linha.status_hora?.slice(0, 10))
        .filter((dia): dia is string => Boolean(dia)),
    ),
  ).sort();
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
      report_datas_base: reportDatasBase,
    });
  }

  // 4. Grava tudo numa transação só (função substituir_base_consolidado,
  // scripts/sql/upload-consolidado-atomico.sql): troca retencao_atendimentos
  // inteira, faz o upsert em d1_consolidado e remove do dia quem não veio
  // neste upload. Ou grava tudo, ou nada — antes eram requests separados e
  // uma falha no meio deixava a tabela e o Analítico com bases diferentes.
  // A função também serializa uploads simultâneos (advisory lock): o
  // segundo espera o primeiro terminar, em vez de apagar parte do lote dele.
  const { data: linhasGravadas, error: rpcErr } = await admin.rpc(
    "substituir_base_consolidado",
    {
      p_atendimentos: parseResult.linhas,
      p_consolidado: rows,
      p_data_ref: dataRef,
    },
  );

  if (rpcErr) {
    console.error("[upload-consolidado] erro ao gravar a base:", rpcErr.message);
    return { success: false, error: ERRO_GRAVAR_BASE };
  }

  if (operadoresSemGestor > 0) {
    console.warn(
      `[upload-consolidado] ${operadoresSemGestor} operador(es) do CSV sem gestor cadastrado em d1_operadores_gestor — não entraram no D-1.`,
    );
  }

  revalidatePath("/s/reports/consolidado");
  revalidatePath("/c/reports/consolidado");

  return {
    success: true,
    rowsWritten: typeof linhasGravadas === "number" ? linhasGravadas : parseResult.linhas.length,
    operadoresAtualizados: rows.length,
    operadoresSemGestor,
  };
}
