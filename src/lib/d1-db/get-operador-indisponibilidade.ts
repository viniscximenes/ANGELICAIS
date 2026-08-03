import { createAdminClient } from "@/lib/supabase/admin";
import { getEmailVariants } from "@/lib/utils/email-variants";
import { dataRefHojeBR, formatSegundosParaHora, horaParaSegundos } from "./parse";
import type { UserIndispView } from "./types";

const ZERO_HORA = "00:00:00";

const EMPTY: UserIndispView = {
  indisp: null,
  pausa: null,
  horaReport: "—",
};

/**
 * Lê a Indisponibilidade pessoal de um operador (d1_indisponibilidade +
 * d1_tempo_logado.tempo_logado, data de hoje). Substitui
 * getIndisponibilidadeData + filterIndispByEmail (Sheets) — mesmo shape de
 * retorno (UserIndispView).
 */
export async function getOperadorIndisponibilidade(email: string): Promise<UserIndispView> {
  const admin = createAdminClient();
  const variantes = getEmailVariants(email);
  const dataRef = dataRefHojeBR();

  const [{ data, error }, { data: tempoLogadoRow }] = await Promise.all([
    admin
      .from("d1_indisponibilidade")
      .select(
        "operator_email, indisp_percent, pausa10, pausa20, pausa_particular, pausa_mon_taref, pausa_treinamento, pausa_feedback, pausa_pre_pausa, pausa_ativo, pausa_take_blip, pausa_email, pausa_indisponivel, pausa_sistema, report_hora",
      )
      .in("operator_email", variantes)
      .eq("data_ref", dataRef)
      .maybeSingle(),
    admin
      .from("d1_tempo_logado")
      .select("tempo_logado")
      .in("operator_email", variantes)
      .eq("data_ref", dataRef)
      .maybeSingle(),
  ]);

  if (error) {
    console.error("[get-operador-indisponibilidade] erro ao buscar d1_indisponibilidade:", error.message);
    return EMPTY;
  }

  if (!data) return EMPTY;

  const pausa10 = data.pausa10 ?? ZERO_HORA;
  const pausa20 = data.pausa20 ?? ZERO_HORA;
  const nr17Seg = horaParaSegundos(pausa10) + horaParaSegundos(pausa20);

  return {
    indisp: {
      email: data.operator_email,
      indispPercent: data.indisp_percent,
      tempoLogado: tempoLogadoRow?.tempo_logado ?? ZERO_HORA,
    },
    pausa: {
      email: data.operator_email,
      tempoIndisponivel: formatSegundosParaHora(
        horaParaSegundos(pausa10) +
          horaParaSegundos(pausa20) +
          horaParaSegundos(data.pausa_particular ?? ZERO_HORA) +
          horaParaSegundos(data.pausa_mon_taref ?? ZERO_HORA) +
          horaParaSegundos(data.pausa_treinamento ?? ZERO_HORA) +
          horaParaSegundos(data.pausa_feedback ?? ZERO_HORA) +
          horaParaSegundos(data.pausa_pre_pausa ?? ZERO_HORA) +
          horaParaSegundos(data.pausa_ativo ?? ZERO_HORA) +
          horaParaSegundos(data.pausa_take_blip ?? ZERO_HORA) +
          horaParaSegundos(data.pausa_email ?? ZERO_HORA) +
          horaParaSegundos(data.pausa_indisponivel ?? ZERO_HORA) +
          horaParaSegundos(data.pausa_sistema ?? ZERO_HORA),
      ),
      pausa10,
      pausa20,
      pausaParticular: data.pausa_particular ?? ZERO_HORA,
      pausaMonitoramento: data.pausa_mon_taref ?? ZERO_HORA,
      pausaTreinamento: data.pausa_treinamento ?? ZERO_HORA,
      pausaFeedback: data.pausa_feedback ?? ZERO_HORA,
      pausaPrePausa: data.pausa_pre_pausa ?? ZERO_HORA,
      pausaAtivo: data.pausa_ativo ?? ZERO_HORA,
      pausaTakeBlip: data.pausa_take_blip ?? ZERO_HORA,
      pausaOperacional: ZERO_HORA,
      pausaEmail: data.pausa_email ?? ZERO_HORA,
      pausaIndisponivel: data.pausa_indisponivel ?? ZERO_HORA,
      pausaSistema: data.pausa_sistema ?? ZERO_HORA,
      nr17: formatSegundosParaHora(nr17Seg),
    },
    horaReport: data.report_hora ?? "—",
  };
}
