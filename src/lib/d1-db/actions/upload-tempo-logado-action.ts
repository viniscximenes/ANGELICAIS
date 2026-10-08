"use server";

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
import { diasDistintosOrdenados } from "@/lib/utils/parse-data-flexivel";
import { COLUNAS_PAUSA, REASON_TO_COLUNA } from "../reason-codes-indisp";
import { META_TEMPO_LOGADO_SEGUNDOS } from "../types";

type UploadTempoLogadoResult =
  | {
      success: true;
      rowsWritten: number;
      operadoresAtualizados: number;
      operadoresSemGestor: number;
    }
  | { success: false; error: string };

/** Teto de linhas do CSV — o mesmo número dito no aria-label do UploadTempoLogadoDropzone. */
const MAX_LINHAS_CSV = 50_000;

/** Mensagem genérica pro cliente: o erro cru do banco fica só no log do servidor. */
const ERRO_GRAVAR_BASE = "Não foi possível gravar a base. Tente novamente.";

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

/**
 * `logoutConfirmado`: o LOGOUT TIMESTAMP da sessão tem uma linha de estado
 * "Logout" do mesmo operador começando no mesmo instante. Sem ela, o logout
 * é só o fim da janela do relatório (operador ainda logado quando a base foi
 * extraída) e a sessão conta como aberta — a tabela mostra "Ainda logado"
 * em vez da hora da extração.
 */
function aplicarLinha(agg: Agregado, linha: TempoLogadoCsvRow, logoutConfirmado: boolean) {
  if (linha.state.trim().toLowerCase() === "login") {
    agg.tempoLogadoSeg += linha.login_time_seg ?? 0;
    if (linha.login_timestamp_hora) agg.loginHoras.push(linha.login_timestamp_hora);
    if (linha.logout_timestamp_hora && logoutConfirmado) {
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

  // Server Action é endpoint público: o tipo do TS não chega em runtime.
  if (typeof csvText !== "string" || csvText.length === 0) {
    return { success: false, error: "Arquivo vazio ou inválido." };
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

  // Mesmo limite anunciado na área de anexo (aria-label do dropzone) — antes
  // só existia no texto. Conta as linhas lidas (válidas + puladas), não só
  // as válidas: o teto barra arquivo errado/gigante antes de gravar no banco.
  if (parseResult.lidas > MAX_LINHAS_CSV) {
    return {
      success: false,
      error: `O arquivo tem ${parseResult.lidas.toLocaleString("pt-BR")} linhas — o limite é ${MAX_LINHAS_CSV.toLocaleString("pt-BR")}.`,
    };
  }

  // Logouts de verdade: toda saída real gera uma linha de estado "Logout"
  // do operador começando no instante do logout. A sessão que ainda estava
  // aberta quando a base foi extraída vem com LOGOUT TIMESTAMP = fim da
  // janela do relatório (ex.: 20:59:59 pra todo mundo logado) e sem essa
  // linha — antes ela virava um logout falso, na hora da extração.
  const logoutsRegistrados = new Set<string>();
  for (const linha of parseResult.linhas) {
    if (linha.state.trim().toLowerCase() === "logout" && linha.timestamp_bruto) {
      logoutsRegistrados.add(`${linha.agent_user}|${linha.timestamp_bruto}`);
    }
  }
  // Export antigo sem a coluna TIMESTAMP: não dá pra conferir, mantém o
  // comportamento anterior (confia no LOGOUT TIMESTAMP).
  const logoutConfirmado = (linha: TempoLogadoCsvRow) =>
    !parseResult.temColunaTimestamp ||
    (linha.logout_timestamp_bruto !== null &&
      logoutsRegistrados.has(`${linha.agent_user}|${linha.logout_timestamp_bruto}`));

  // 1. Agrega por operador (agent_user)
  const porOperador = new Map<string, Agregado>();
  for (const linha of parseResult.linhas) {
    let agg = porOperador.get(linha.agent_user);
    if (!agg) {
      agg = novoAgregado(linha.agent_email.trim().toLowerCase(), linha.agent_name);
      porOperador.set(linha.agent_user, agg);
    }
    aplicarLinha(agg, linha, logoutConfirmado(linha));
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
  // Dias da base colada (coluna DATE das linhas válidas, YYYY-MM-DD) — vão
  // pro cabeçalho do report ("base do dia 03/10" / "bases do dia 02/10 -
  // 03/10"), igual ao Consolidado: um gestor pode colar a base de outra
  // data e a atualização vale pra todos.
  const reportDatasBase = diasDistintosOrdenados(parseResult.linhas.map((l) => l.data_ref));

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
      report_datas_base: reportDatasBase,
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

  // Grava as duas tabelas numa transação só (função
  // substituir_base_tempo_logado, scripts/sql/upload-tempo-logado-atomico.sql)
  // — mesmo padrão do upload do Consolidado. Ou grava tudo, ou nada: antes
  // eram dois upserts separados e uma falha no segundo deixava a tabela com
  // a base nova e o Analítico (pausas/aderência) com a velha. A função também
  // pega o mesmo advisory lock do "Limpar Base": um espera o outro terminar.
  // Cada upload é a base completa do dia: quem tinha linha hoje e não veio
  // neste CSV sai das duas tabelas (mesma regra de substituir_base_consolidado
  // — antes ficava com os números do upload anterior).
  //
  // RISCO-ACEITO: um CSV com só parte da operação (ex.: uma equipe) apaga as linhas de hoje de todas as outras equipes.
  // Motivo: decisão do usuário (2026-10-08) — a base é única/compartilhada e cada upload deve ser a base completa do dia, como no Consolidado.
  // Mitigação: lote sem nenhum operador mapeado é recusado (aqui e na função do banco); a base fica salva no sistema externo e basta colar a completa de novo.
  // Revisar quando: houver upload por equipe, ou a base deixar de ser exportada inteira (regra no Supabase: substituir_base_tempo_logado, scripts/sql/upload-tempo-logado-atomico.sql).
  //
  // Nenhum operador do CSV mapeado a gestor (arquivo errado, ou base de
  // outra operação): nada seria gravado e a tela mostraria "concluído" sem
  // mudar nada. Recusa com a mesma mensagem do upload do Consolidado.
  if (rowsTempoLogado.length === 0) {
    return {
      success: false,
      error:
        "Nenhum operador do CSV está vinculado a um gestor — a base não foi alterada. Confira se o arquivo é a base certa.",
    };
  }

  const { error: rpcErr } = await admin.rpc("substituir_base_tempo_logado", {
    p_tempo_logado: rowsTempoLogado,
    p_indisponibilidade: rowsIndisp,
    p_data_ref: dataRef,
  });

  if (rpcErr) {
    console.error("[upload-tempo-logado] erro ao gravar a base:", rpcErr.message);
    return { success: false, error: ERRO_GRAVAR_BASE };
  }

  if (operadoresSemGestor > 0) {
    console.warn(
      `[upload-tempo-logado] ${operadoresSemGestor} operador(es) do CSV sem gestor cadastrado em d1_operadores_gestor — não entraram no D-1.`,
    );
  }

  // Sem revalidatePath (mesmo motivo do upload do Consolidado): o
  // UploadTempoLogadoDropzone (único chamador) faz window.location.reload()
  // logo depois — revalidar só refazia a página dentro da resposta pra ela
  // ser jogada fora pelo reload.

  return {
    success: true,
    rowsWritten: parseResult.validas,
    operadoresAtualizados: rowsTempoLogado.length,
    operadoresSemGestor,
  };
}
