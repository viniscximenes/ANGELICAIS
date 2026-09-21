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
 * @param metaIndisponibilidade Meta configurável do gestor (config
 * `gestor_config_fantasia.meta_indisponibilidade`, via
 * getConfigTabelaTempoIndisp) — usada só pra `cumpriuMeta` (indisp_percent <
 * meta). Fallback META_INDISPONIBILIDADE (14.5%) se omitido. Quem chama no
 * polling (refreshIndisponibilidadeAction) precisa passar a meta ATUAL do
 * gestor, senão cada refetch de 30s recalcularia cumpriuMeta com o default,
 * descartando silenciosamente a meta configurada.
 *
 * NR17%/Particular%/Outras Pausas% são percentuais ABSOLUTOS — cada um é o
 * tempo daquela(s) pausa(s) ÷ tempo logado, não ÷ tempo indisponível (isso
 * daria a proporção relativa dentro da indisponibilidade, ex: NR17
 * aparecendo como 100% quando na verdade é só 10% da jornada).
 *
 * "Outras Pausas" = tudo que NÃO é NR17 (pausa10+pausa20) nem Particular —
 * soma de treinamento, feedback, pré-pausa, ativo, take blip, email,
 * indisponível, sistema e monitoramento/tarefa. Por construção, NR17% +
 * Particular% + Outras Pausas% = (soma de TODAS as colunas de pausa que
 * existem no schema atual) ÷ tempo logado — o que não é necessariamente
 * igual a indisp_percent (vindo pronto do CSV/sistema externo), porque esse
 * indisp_percent pode ter sido calculado pelo sistema de origem incluindo
 * categorias de pausa que existiam no Sheets antigo mas não têm coluna
 * neste schema (pausa15/pausa40/operacional/pausaSemMotivo — ver abaixo).
 * Ver relatório da fusão pra a checagem de consistência feita.
 *
 * O denominador é só tempo_logado (SEM somar tempo_indisponivel de novo):
 * o "tempo logado" já é o span completo da sessão (login → logout) no CSV
 * de origem — as pausas são sub-intervalos DENTRO desse span, não períodos
 * adicionais fora dele. Somar os dois dobraria a contagem das pausas.
 *
 * pausa15/pausa40/operacional/pausaSemMotivo não têm coluna no schema novo
 * (ver PausasDetalhe) — ficam sempre "00:00:00", e por isso não entram na
 * soma de "Outras Pausas" (não têm de onde vir).
 */
export async function getGestorIndisponibilidade(
  gestorId: string,
  metaIndisponibilidade: number = META_INDISPONIBILIDADE,
): Promise<GestorIndispData> {
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
    // "Outras Pausas" (coluna da tabela unificada) = tudo que NÃO é NR17
    // (pausa10+pausa20) nem Particular — as outras 7 categorias abaixo,
    // mesmo critério documentado no comentário da função (soma não cobre
    // NR17/Particular, cobre o resto). Mesmo parser (horaParaSegundos) e
    // mesmo denominador (tempoLogadoSeg) das demais colunas de %.
    const outrasPausasSeg =
      horaParaSegundos(row.pausa_treinamento) +
      horaParaSegundos(row.pausa_feedback) +
      horaParaSegundos(row.pausa_pre_pausa) +
      horaParaSegundos(row.pausa_ativo) +
      horaParaSegundos(row.pausa_take_blip) +
      horaParaSegundos(row.pausa_email) +
      horaParaSegundos(row.pausa_indisponivel) +
      horaParaSegundos(row.pausa_sistema) +
      horaParaSegundos(row.pausa_mon_taref);

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
      cumpriuMeta: row.indisp_percent !== null && row.indisp_percent < metaIndisponibilidade,
      nr17Pct: pct(pausa10Seg + pausa20Seg, tempoLogadoSeg),
      pausaParticularPct: pct(particularSeg, tempoLogadoSeg),
      outrasPausasPct: pct(outrasPausasSeg, tempoLogadoSeg),
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
