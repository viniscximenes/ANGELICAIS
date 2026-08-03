import { createAdminClient } from "@/lib/supabase/admin";
import { dataRefHojeBR, formatSegundosParaHora, horaParaSegundos } from "./parse";
import type { IndisponibilidadeData, OperadorIndisp, OperadorPausa } from "./types";

const ZERO_HORA = "00:00:00";

function somarTempoIndisponivel(row: {
  pausa10: string | null;
  pausa20: string | null;
  pausa_particular: string | null;
  pausa_mon_taref: string | null;
  pausa_treinamento: string | null;
  pausa_feedback: string | null;
  pausa_pre_pausa: string | null;
  pausa_ativo: string | null;
  pausa_take_blip: string | null;
  pausa_email: string | null;
  pausa_indisponivel: string | null;
  pausa_sistema: string | null;
}): number {
  return (
    horaParaSegundos(row.pausa10) +
    horaParaSegundos(row.pausa20) +
    horaParaSegundos(row.pausa_particular) +
    horaParaSegundos(row.pausa_mon_taref) +
    horaParaSegundos(row.pausa_treinamento) +
    horaParaSegundos(row.pausa_feedback) +
    horaParaSegundos(row.pausa_pre_pausa) +
    horaParaSegundos(row.pausa_ativo) +
    horaParaSegundos(row.pausa_take_blip) +
    horaParaSegundos(row.pausa_email) +
    horaParaSegundos(row.pausa_indisponivel) +
    horaParaSegundos(row.pausa_sistema)
  );
}

/**
 * Lê a Indisponibilidade de TODOS os operadores da empresa (sem filtro de
 * gestor), data de hoje. Usado pela seção de Pausas Detalhadas do ADM
 * (manage_system) em /d-1/indisponibilidade. Substitui getIndisponibilidadeData
 * (Sheets, guias 'INDISP'/'PAUSA').
 */
export async function getTodosOperadoresIndisponibilidade(): Promise<IndisponibilidadeData> {
  const admin = createAdminClient();
  const dataRef = dataRefHojeBR();

  const [{ data, error }, { data: tlRows }] = await Promise.all([
    admin
      .from("d1_indisponibilidade")
      .select(
        "operator_email, indisp_percent, pausa10, pausa20, pausa_particular, pausa_mon_taref, pausa_treinamento, pausa_feedback, pausa_pre_pausa, pausa_ativo, pausa_take_blip, pausa_email, pausa_indisponivel, pausa_sistema, report_hora",
      )
      .eq("data_ref", dataRef),
    admin.from("d1_tempo_logado").select("operator_email, tempo_logado").eq("data_ref", dataRef),
  ]);

  if (error) {
    console.error("[get-todos-indisponibilidade] erro ao buscar d1_indisponibilidade:", error.message);
    return { operadoresIndisp: [], operadoresPausa: [], horaReport: "—" };
  }

  const rows = data ?? [];
  const tempoLogadoPorEmail = new Map((tlRows ?? []).map((r) => [r.operator_email, r.tempo_logado]));

  const operadoresIndisp: OperadorIndisp[] = rows.map((row) => ({
    email: row.operator_email,
    indispPercent: row.indisp_percent,
    tempoLogado: tempoLogadoPorEmail.get(row.operator_email) ?? ZERO_HORA,
  }));

  const operadoresPausa: OperadorPausa[] = rows.map((row) => {
    const pausa10 = row.pausa10 ?? ZERO_HORA;
    const pausa20 = row.pausa20 ?? ZERO_HORA;
    return {
      email: row.operator_email,
      tempoIndisponivel: formatSegundosParaHora(somarTempoIndisponivel(row)),
      pausa10,
      pausa20,
      pausaParticular: row.pausa_particular ?? ZERO_HORA,
      pausaMonitoramento: row.pausa_mon_taref ?? ZERO_HORA,
      pausaTreinamento: row.pausa_treinamento ?? ZERO_HORA,
      pausaFeedback: row.pausa_feedback ?? ZERO_HORA,
      pausaPrePausa: row.pausa_pre_pausa ?? ZERO_HORA,
      pausaAtivo: row.pausa_ativo ?? ZERO_HORA,
      pausaTakeBlip: row.pausa_take_blip ?? ZERO_HORA,
      pausaOperacional: ZERO_HORA,
      pausaEmail: row.pausa_email ?? ZERO_HORA,
      pausaIndisponivel: row.pausa_indisponivel ?? ZERO_HORA,
      pausaSistema: row.pausa_sistema ?? ZERO_HORA,
      nr17: formatSegundosParaHora(horaParaSegundos(pausa10) + horaParaSegundos(pausa20)),
    };
  });

  return {
    operadoresIndisp,
    operadoresPausa,
    horaReport: rows[0]?.report_hora ?? "—",
  };
}
