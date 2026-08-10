"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEmailPrefix } from "@/lib/utils/email-variants";
import {
  dataRefHojeBR,
  formatSegundosParaHora,
  horaAtualBR,
  somarHoraMaisSegundos,
} from "../parse";
import { parseTempoLogadoCsv, type TempoLogadoCsvRow } from "../parse-tempo-logado-csv";
import { COLUNAS_PAUSA, REASON_TO_COLUNA } from "../reason-codes-indisp";
import { META_TEMPO_LOGADO_SEGUNDOS } from "../types";

export type UploadTempoLogadoResult =
  | {
      success: true;
      rowsWritten: number;
      operadoresAtualizados: number;
      operadoresSemGestor: number;
    }
  | { success: false; error: string };

type Agregado = {
  email: string;
  operatorName: string;
  tempoLogadoSeg: number;
  pausas: Record<string, number>; // coluna -> segundos
  loginHoras: string[]; // "HH:MM:SS" de cada sessão de login iniciada
  logoutHoras: string[]; // "HH:MM:SS" de sessões de login já fechadas
  sessaoAberta: boolean; // teve pelo menos uma linha "login" sem logout registrado
  pausa10Horas: string[]; // "HH:MM:SS" de início de cada ocorrência de Pausa 10 no dia
  pausa20Horas: string[]; // idem para Pausa 20
};

function novoAgregado(email: string, nome: string): Agregado {
  const pausas: Record<string, number> = {};
  for (const col of COLUNAS_PAUSA) pausas[col] = 0;
  return {
    email,
    operatorName: nome,
    tempoLogadoSeg: 0,
    pausas,
    loginHoras: [],
    logoutHoras: [],
    sessaoAberta: false,
    pausa10Horas: [],
    pausa20Horas: [],
  };
}

function aplicarLinha(agg: Agregado, linha: TempoLogadoCsvRow) {
  if (linha.state.trim().toLowerCase() === "login") {
    agg.tempoLogadoSeg += linha.login_time_seg ?? 0;
    if (linha.login_timestamp_hora) agg.loginHoras.push(linha.login_timestamp_hora);
    if (linha.logout_timestamp_hora) {
      agg.logoutHoras.push(linha.logout_timestamp_hora);
    } else {
      agg.sessaoAberta = true;
    }
  }

  const reason = (linha.reason_code ?? "").trim().toLowerCase();
  const coluna = REASON_TO_COLUNA[reason];
  if (coluna) {
    agg.pausas[coluna] += linha.agent_state_time_seg ?? 0;
  }

  // Hora de início de cada ocorrência — usada pra aderência (1ª/2ª Pausa 10,
  // Pausa 20). Um operador pode tirar Pausa 10 duas vezes no dia; a ordem
  // cronológica (min/max) é resolvida depois de coletar todas.
  if (linha.hora_inicio) {
    if (coluna === "pausa10") agg.pausa10Horas.push(linha.hora_inicio);
    else if (coluna === "pausa20") agg.pausa20Horas.push(linha.hora_inicio);
  }
}

export async function uploadTempoLogadoAction(
  csvText: string,
): Promise<UploadTempoLogadoResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: "Não autenticado" };
  }

  if (!can(user.profile.role, "manage_d1_base")) {
    return { success: false, error: "Sem permissão para atualizar a base" };
  }

  let parseResult;
  try {
    parseResult = parseTempoLogadoCsv(csvText);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao processar CSV",
    };
  }

  console.info(
    `[upload-tempo-logado] parse concluído. Lidas: ${parseResult.lidas}, válidas: ${parseResult.validas}, puladas: ${parseResult.puladas}`,
  );

  if (parseResult.linhas.length === 0) {
    return { success: false, error: "Nenhuma linha válida encontrada no CSV." };
  }

  // 1. Agrega por operador (agent_user)
  const porOperador = new Map<string, Agregado>();
  for (const linha of parseResult.linhas) {
    let agg = porOperador.get(linha.agent_user);
    if (!agg) {
      agg = novoAgregado(linha.agent_email.trim().toLowerCase(), linha.agent_name);
      porOperador.set(linha.agent_user, agg);
    }
    aplicarLinha(agg, linha);
  }

  const admin = createAdminClient();

  // 2. Resolve gestor_id por operador via d1_operadores_gestor — mesmo
  // mapeamento global usado no upload do Consolidado.
  const { data: mapeamento, error: mapErr } = await admin
    .from("d1_operadores_gestor")
    .select("gestor_id, operador_email");

  if (mapErr) {
    console.error(
      "[upload-tempo-logado] erro ao buscar mapeamento de operadores por gestor:",
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

  const dataRef = dataRefHojeBR();
  const reportHora = horaAtualBR();

  const rowsTempoLogado: Record<string, unknown>[] = [];
  const rowsIndisp: Record<string, unknown>[] = [];
  let operadoresSemGestor = 0;

  for (const [chave, agg] of porOperador) {
    const gestorId = gestorPorPrefixo.get(chave);
    if (!gestorId) {
      operadoresSemGestor++;
      continue;
    }

    // Horário de login: o mais cedo do dia. Logout: o mais tarde, só se
    // TODAS as sessões de login do dia já foram fechadas (senão o operador
    // ainda está logado e não há um logout final pra mostrar).
    const horaLogin = agg.loginHoras.length > 0 ? agg.loginHoras.sort()[0] : null;
    const horaLogout =
      !agg.sessaoAberta && agg.logoutHoras.length > 0
        ? agg.logoutHoras.sort()[agg.logoutHoras.length - 1]
        : null;

    const tempoRestanteSeg = Math.max(0, META_TEMPO_LOGADO_SEGUNDOS - agg.tempoLogadoSeg);

    rowsTempoLogado.push({
      data_ref: dataRef,
      gestor_id: gestorId,
      operator_email: agg.email,
      operator_name: agg.operatorName,
      tempo_logado: formatSegundosParaHora(agg.tempoLogadoSeg),
      tempo_restante: formatSegundosParaHora(tempoRestanteSeg),
      logout_estimado: somarHoraMaisSegundos(reportHora, tempoRestanteSeg),
      hora_login: horaLogin,
      hora_logout: horaLogout,
      report_hora: reportHora,
      report_nome_supervisor: user.profile.fullName,
    });

    // Tempo indisponível total = soma de todas as pausas mapeadas (definição
    // auto-consistente: NR17% + Particular% + Outras% = 100% desse total).
    // Indisponibilidade % = tempo indisponível ÷ tempo logado. O "tempo
    // logado" (LOGIN TIME da linha "Login" do CSV) já é o span completo da
    // sessão (login → logout) — as pausas são sub-intervalos DENTRO desse
    // span, não períodos adicionais fora dele (confirmado inspecionando o
    // CSV bruto: a linha "Login" cobre o mesmo intervalo de tempo que as
    // linhas de pausa nela contidas). Por isso o denominador NÃO soma tempo
    // indisponível de novo — tempoLogadoSeg já o inclui.
    const tempoIndisponivelSeg = COLUNAS_PAUSA.reduce((acc, col) => acc + agg.pausas[col], 0);
    const indispPercent =
      agg.tempoLogadoSeg > 0 ? (tempoIndisponivelSeg / agg.tempoLogadoSeg) * 100 : null;

    const pausasFormatadas: Record<string, string> = {};
    for (const col of COLUNAS_PAUSA) {
      pausasFormatadas[col] = formatSegundosParaHora(agg.pausas[col]);
    }

    // 1ª/2ª ocorrência por ordem cronológica de início no dia — Pausa 20
    // some entre elas, então a mais cedo é a 1ª Pausa 10 e a mais tarde a 2ª.
    const pausa10HorasOrdenadas = [...agg.pausa10Horas].sort();
    const pausa20HorasOrdenadas = [...agg.pausa20Horas].sort();

    rowsIndisp.push({
      data_ref: dataRef,
      gestor_id: gestorId,
      operator_email: agg.email,
      operator_name: agg.operatorName,
      indisp_percent: indispPercent !== null ? Math.round(indispPercent * 100) / 100 : null,
      tempo_indisponivel: formatSegundosParaHora(tempoIndisponivelSeg),
      ...pausasFormatadas,
      pausa10_1_hora_inicio: pausa10HorasOrdenadas[0] ?? null,
      pausa10_2_hora_inicio: pausa10HorasOrdenadas[1] ?? null,
      pausa20_hora_inicio: pausa20HorasOrdenadas[0] ?? null,
      report_hora: reportHora,
      report_nome_supervisor: user.profile.fullName,
    });
  }

  if (rowsTempoLogado.length > 0) {
    const { error: upsertErr1 } = await admin
      .from("d1_tempo_logado")
      .upsert(rowsTempoLogado, { onConflict: "data_ref,operator_email" });

    if (upsertErr1) {
      console.error("[upload-tempo-logado] erro no upsert de d1_tempo_logado:", upsertErr1.message);
      return {
        success: false,
        error: `Erro ao gravar d1_tempo_logado: ${upsertErr1.message}`,
      };
    }

    const { error: upsertErr2 } = await admin
      .from("d1_indisponibilidade")
      .upsert(rowsIndisp, { onConflict: "data_ref,operator_email" });

    if (upsertErr2) {
      console.error(
        "[upload-tempo-logado] erro no upsert de d1_indisponibilidade:",
        upsertErr2.message,
      );
      return {
        success: false,
        error: `Erro ao gravar d1_indisponibilidade: ${upsertErr2.message}`,
      };
    }
  }

  if (operadoresSemGestor > 0) {
    console.warn(
      `[upload-tempo-logado] ${operadoresSemGestor} operador(es) do CSV sem gestor cadastrado em d1_operadores_gestor — não entraram no D-1.`,
    );
  }

  revalidatePath("/d-1/tempo-logado");
  revalidatePath("/d-1/indisponibilidade");
  revalidatePath("/gestor/tempo-logado");
  revalidatePath("/reports/tempo-indisponibilidade");

  return {
    success: true,
    rowsWritten: parseResult.validas,
    operadoresAtualizados: rowsTempoLogado.length,
    operadoresSemGestor,
  };
}
