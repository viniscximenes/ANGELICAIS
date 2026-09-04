import { createAdminClient } from "@/lib/supabase/admin";
import { getEmailPrefix, getEmailVariants } from "@/lib/utils/email-variants";
import { getRosterOperadoresGestor } from "./get-roster-gestor";
import { dataRefHojeBR, horaParaSegundos } from "./parse";
import {
  META_INDISPONIBILIDADE,
  type GestorIndispData,
  type GestorIndispLinha,
  type PausasDetalhe,
} from "./types";

const ZERO_HORA = "00:00:00";

function pct(numerador: number, denominador: number): number | null {
  if (denominador <= 0) return null;
  return (numerador / denominador) * 100;
}

const PAUSAS_ZERADAS: PausasDetalhe = {
  pausa10: ZERO_HORA,
  pausa20: ZERO_HORA,
  pausaParticular: ZERO_HORA,
  monOuTaref: ZERO_HORA,
  trenOuReun: ZERO_HORA,
  feedback: ZERO_HORA,
  prePausa: ZERO_HORA,
  ativo: ZERO_HORA,
  takeBlip: ZERO_HORA,
  pausa15: ZERO_HORA,
  pausa40: ZERO_HORA,
  operacional: ZERO_HORA,
  email: ZERO_HORA,
  indisponivel: ZERO_HORA,
  sistema: ZERO_HORA,
  pausaSemMotivo: ZERO_HORA,
};

/**
 * Lê a Indisponibilidade da equipe de um gestor (d1_indisponibilidade, data
 * de hoje). Substitui fetchGestorIndisponibilidade (Sheets) — mesmo shape
 * de retorno (GestorIndispData).
 *
 * A lista de operadores vem SEMPRE do roster (d1_operadores_gestor) — um
 * operador cadastrado mas sem upload de hoje aparece com tudo zerado. Só
 * retorna `operadores: []` quando o roster está vazio.
 *
 * NR17%/Particular%/Outras% são percentuais ABSOLUTOS — cada um é o tempo
 * daquela pausa ÷ tempo logado, não ÷ tempo indisponível (isso daria a
 * proporção relativa dentro da indisponibilidade, ex: NR17 aparecendo como
 * 100% quando na verdade é só 10% da jornada). A soma dos três fica ≈
 * indisponibilidade total (a menos de arredondamento).
 *
 * O denominador é só tempo_logado (SEM somar tempo_indisponivel de novo):
 * o "tempo logado" já é o span completo da sessão (login → logout) no CSV
 * de origem — as pausas são sub-intervalos DENTRO desse span, não períodos
 * adicionais fora dele. Somar os dois dobraria a contagem das pausas.
 *
 * pausa15/pausa40/operacional/pausaSemMotivo não têm coluna no schema novo
 * (ver PausasDetalhe) — ficam sempre "00:00:00".
 */
export async function getGestorIndisponibilidade(gestorId: string): Promise<GestorIndispData> {
  const admin = createAdminClient();

  const roster = await getRosterOperadoresGestor(gestorId);
  if (roster.length === 0) return { operadores: [] };

  // Filtra por operator_email (via roster), NÃO por gestor_id — mesmo motivo
  // de get-gestor-consolidado.ts: d1_indisponibilidade/d1_tempo_logado têm
  // uma linha "dona" por operador/dia, então gestor_id não reflete operador
  // em duas equipes.
  const emailsComVariantes = roster.flatMap(getEmailVariants);

  const [{ data, error }, { data: gestorProfile }, { data: tempoLogadoRows }] =
    await Promise.all([
      admin
        .from("d1_indisponibilidade")
        .select(
          "operator_email, indisp_percent, tempo_indisponivel, pausa10, pausa20, pausa_particular, pausa_mon_taref, pausa_treinamento, pausa_feedback, pausa_pre_pausa, pausa_ativo, pausa_take_blip, pausa_email, pausa_indisponivel, pausa_sistema, pausa10_1_hora_inicio, pausa10_2_hora_inicio, pausa20_hora_inicio, report_hora, report_nome_supervisor",
        )
        .in("operator_email", emailsComVariantes)
        .eq("data_ref", dataRefHojeBR()),
      admin.from("profiles").select("full_name").eq("id", gestorId).maybeSingle(),
      admin
        .from("d1_tempo_logado")
        .select("operator_email, tempo_logado")
        .in("operator_email", emailsComVariantes)
        .eq("data_ref", dataRefHojeBR()),
    ]);

  if (error) {
    console.error("[get-gestor-indisponibilidade] erro ao buscar d1_indisponibilidade:", error.message);
  }

  const rows = data ?? [];
  const nomeGestor = gestorProfile?.full_name ?? "";
  // Chave por PREFIXO — mesma pessoa pode vir @alloha.com ou
  // @sumicity.net.br no CSV; o roster só guarda @alloha.com.
  const rowPorPrefixo = new Map(rows.map((row) => [getEmailPrefix(row.operator_email), row]));
  const tempoLogadoSegPorPrefixo = new Map(
    (tempoLogadoRows ?? []).map((row) => [
      getEmailPrefix(row.operator_email),
      horaParaSegundos(row.tempo_logado),
    ]),
  );

  const operadores: GestorIndispLinha[] = roster.map((email) => {
    const row = rowPorPrefixo.get(getEmailPrefix(email));
    if (!row) {
      return {
        email,
        gestor: nomeGestor,
        indisponibilidade: null,
        cumpriuMeta: false,
        nr17Pct: null,
        pausaParticularPct: null,
        outrasPausasPct: null,
        pausas: PAUSAS_ZERADAS,
        pausa10PrimeiraHora: null,
        pausa10SegundaHora: null,
        pausa20Hora: null,
      };
    }
    const tempoLogadoSeg = tempoLogadoSegPorPrefixo.get(getEmailPrefix(email)) ?? 0;
    const pausa10Seg = horaParaSegundos(row.pausa10);
    const pausa20Seg = horaParaSegundos(row.pausa20);
    const particularSeg = horaParaSegundos(row.pausa_particular);
    const outrasSeg =
      horaParaSegundos(row.pausa_mon_taref) +
      horaParaSegundos(row.pausa_treinamento) +
      horaParaSegundos(row.pausa_feedback) +
      horaParaSegundos(row.pausa_pre_pausa) +
      horaParaSegundos(row.pausa_ativo) +
      horaParaSegundos(row.pausa_take_blip) +
      horaParaSegundos(row.pausa_email) +
      horaParaSegundos(row.pausa_indisponivel) +
      horaParaSegundos(row.pausa_sistema);

    const pausas: PausasDetalhe = {
      pausa10: row.pausa10 ?? ZERO_HORA,
      pausa20: row.pausa20 ?? ZERO_HORA,
      pausaParticular: row.pausa_particular ?? ZERO_HORA,
      monOuTaref: row.pausa_mon_taref ?? ZERO_HORA,
      trenOuReun: row.pausa_treinamento ?? ZERO_HORA,
      feedback: row.pausa_feedback ?? ZERO_HORA,
      prePausa: row.pausa_pre_pausa ?? ZERO_HORA,
      ativo: row.pausa_ativo ?? ZERO_HORA,
      takeBlip: row.pausa_take_blip ?? ZERO_HORA,
      pausa15: ZERO_HORA,
      pausa40: ZERO_HORA,
      operacional: ZERO_HORA,
      email: row.pausa_email ?? ZERO_HORA,
      indisponivel: row.pausa_indisponivel ?? ZERO_HORA,
      sistema: row.pausa_sistema ?? ZERO_HORA,
      pausaSemMotivo: ZERO_HORA,
    };

    return {
      // Email canônico do roster — mantém a identidade estável entre
      // uploads mesmo se o CSV variar de domínio.
      email,
      gestor: nomeGestor,
      indisponibilidade: row.indisp_percent,
      cumpriuMeta: row.indisp_percent !== null && row.indisp_percent < META_INDISPONIBILIDADE,
      nr17Pct: pct(pausa10Seg + pausa20Seg, tempoLogadoSeg),
      pausaParticularPct: pct(particularSeg, tempoLogadoSeg),
      outrasPausasPct: pct(outrasSeg, tempoLogadoSeg),
      pausas,
      pausa10PrimeiraHora: row.pausa10_1_hora_inicio ?? null,
      pausa10SegundaHora: row.pausa10_2_hora_inicio ?? null,
      pausa20Hora: row.pausa20_hora_inicio ?? null,
    };
  });

  const rowComHora = rows.find(
    (r) => r.report_hora && r.report_hora !== "00:00:00" && r.report_hora !== "00:00",
  );

  return {
    operadores,
    horaReport: rowComHora?.report_hora ?? rows[0]?.report_hora ?? undefined,
    nomeSupervisorReport:
      rowComHora?.report_nome_supervisor ?? rows[0]?.report_nome_supervisor ?? null,
  };
}
