import { createAdminClient } from "@/lib/supabase/admin";
import { dataRefHojeBR } from "@/lib/d1-db/parse";
import { getRosterOperadoresGestorOuErro } from "@/lib/d1-db/get-roster-gestor";
import { hashCurto } from "@/lib/d1-db/versao-consolidado";
import { resolveNomeSupervisorReportExibicao } from "@/lib/gestor/resolve-nome-supervisor-report";
import { DEFAULT_ORDEM_TABELA_TMA, isOrdemTabelaTma, type OrdemTabelaTma } from "@/lib/gestor/config-tabela-tma/types";
import { ordenarOperadoresTma } from "@/lib/gestor/config-tabela-tma/ordenar-operadores-tma";
import { getConfigGestorTma, getTmaThresholdConfig, statusTmaDe, type TmaStatus, type TmaThresholdConfig } from "./tma-status";

export type { TmaStatus };

export type OperadorTma = {
  operatorEmail: string;
  qtdAtendimentos: number;
  tmaSegundos: number | null;
  talkMedioSegundos: number | null;
  acwMedioSegundos: number | null;
  status: TmaStatus;
  qtdOutros: number;
  qtdCriticos: number;
  qtdMudEndereco: number;
  qtdFinanceiro: number;
  qtdQualidade: number;
  qtdConcorrencia: number;
  qtdHotlineChurn: number;
};

export type GestorTmaResult = {
  operadores: OperadorTma[];
  reportHora: string | null;
  reportNomeSupervisor: string | null;
  /** Dias (YYYY-MM-DD) da base do último upload — coluna DATE da base, não o dia do upload. */
  reportDatasBase: string[] | null;
  /** Meta efetiva usada pra colorir (override do gestor ou default do KPI), em "MM:SS"; "" sem meta nenhuma (tabela neutra). */
  metaAtualMmSs: string;
  /** Ordenação salva do gestor — `gestor_config_fantasia.ordem_tabela_tma`. */
  ordemTabela: OrdemTabelaTma;
  /**
   * Threshold/direção efetivos (getTmaThresholdConfig) — vai junto com a
   * tabela pro modal do operador usar a MESMA meta que coloriu as linhas,
   * inclusive depois que o polling/salvar trazem uma meta nova.
   */
  thresholdConfig: TmaThresholdConfig;
  /**
   * Versão da base que a tela mostra (nº de linhas + último updated_at de
   * d1_tma + roster + meta) — o polling compara pra saber quando avisar o
   * Analítico (mesma ideia da versão do Consolidado). O upload grava o dia
   * inteiro numa transação (substituir_base_tma), então qualquer base nova
   * muda o updated_at de todas as linhas.
   */
  versaoBase: string;
  /**
   * true quando alguma leitura falhou (d1_tma, roster, ordenação ou meta).
   * Os demais campos vêm vazios/padrão e NÃO devem ser mostrados como "sem
   * dados" — mesmo contrato do getGestorConsolidado.
   */
  erro: boolean;
};

const RESULTADO_ERRO: GestorTmaResult = {
  operadores: [],
  reportHora: null,
  reportNomeSupervisor: null,
  reportDatasBase: null,
  metaAtualMmSs: "",
  ordemTabela: DEFAULT_ORDEM_TABELA_TMA,
  thresholdConfig: { threshold: null, direction: "lower_better" },
  versaoBase: "",
  erro: true,
};

function segundosParaMmSs(segundos: number): string {
  const total = Math.max(0, Math.round(segundos));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * TMA do dia por operador, pra equipe de um gestor (d1_tma). Reaproveita o
 * mesmo threshold binário do KPI mensal `tma` (kpi_definitions), com
 * override opcional por gestor em gestor_config_fantasia.kpi_gestor_metas.tma
 * — mesma fonte usada pelas outras telas de KPI, nunca um valor novo.
 */
export async function getGestorTma(gestorId: string): Promise<GestorTmaResult> {
  const admin = createAdminClient();
  const dataRef = dataRefHojeBR();

  const [{ data: rows, error }, thresholdConfig, { data: config, error: erroConfig }, roster] = await Promise.all([
    admin
      .from("d1_tma")
      .select(
        "operator_email, qtd_atendimentos, tma_segundos, talk_medio_segundos, acw_medio_segundos, report_hora, report_nome_supervisor, report_datas_base, updated_at, qtd_outros, qtd_criticos, qtd_mud_endereco, qtd_financeiro, qtd_qualidade, qtd_concorrencia, qtd_hotline_churn",
      )
      .eq("gestor_id", gestorId)
      .eq("data_ref", dataRef)
      .order("operator_email", { ascending: true }),
    getTmaThresholdConfig(gestorId),
    // Mesma leitura (em cache) que getTmaThresholdConfig usa pra meta.
    getConfigGestorTma(gestorId),
    // Variante que LANÇA: roster vazio por erro de banco não pode virar
    // "equipe sem ninguém".
    getRosterOperadoresGestorOuErro(gestorId).catch(() => null),
  ]);

  // Erro de banco: estado de erro, e não a tabela toda zerada (que parecia
  // "sem dados do dia") — mesma regra do getGestorConsolidado.
  if (error || erroConfig || thresholdConfig.erro || roster === null) {
    if (error) console.error("[get-gestor-tma] erro ao buscar d1_tma:", error.message);
    if (erroConfig) console.error("[get-gestor-tma] erro ao ler a ordenação:", erroConfig.message);
    return RESULTADO_ERRO;
  }

  const threshold = thresholdConfig.threshold;

  function statusDe(valor: number | null): TmaStatus {
    return statusTmaDe(valor, thresholdConfig);
  }

  function operadorDaLinha(row: NonNullable<typeof rows>[number]): OperadorTma {
    return {
      operatorEmail: row.operator_email,
      qtdAtendimentos: row.qtd_atendimentos,
      tmaSegundos: row.tma_segundos !== null ? Number(row.tma_segundos) : null,
      talkMedioSegundos: row.talk_medio_segundos !== null ? Number(row.talk_medio_segundos) : null,
      acwMedioSegundos: row.acw_medio_segundos !== null ? Number(row.acw_medio_segundos) : null,
      status: statusDe(row.tma_segundos !== null ? Number(row.tma_segundos) : null),
      qtdOutros: row.qtd_outros,
      qtdCriticos: row.qtd_criticos,
      qtdMudEndereco: row.qtd_mud_endereco,
      qtdFinanceiro: row.qtd_financeiro,
      qtdQualidade: row.qtd_qualidade,
      qtdConcorrencia: row.qtd_concorrencia,
      qtdHotlineChurn: row.qtd_hotline_churn,
    };
  }

  // Operador do roster sem linha em d1_tma hoje: entra zerado (status neutral),
  // igual ao Consolidado (get-gestor-consolidado.ts), que também parte do roster.
  function operadorSemLinha(email: string): OperadorTma {
    return {
      operatorEmail: email,
      qtdAtendimentos: 0,
      tmaSegundos: null,
      talkMedioSegundos: null,
      acwMedioSegundos: null,
      status: "neutral",
      qtdOutros: 0,
      qtdCriticos: 0,
      qtdMudEndereco: 0,
      qtdFinanceiro: 0,
      qtdQualidade: 0,
      qtdConcorrencia: 0,
      qtdHotlineChurn: 0,
    };
  }

  const doDia = (rows ?? []).map(operadorDaLinha);

  // Linha mais recente do dia — fonte do cabeçalho do report (antes era a
  // primeira em ordem alfabética de e-mail, que podia ser de um envio antigo).
  const maisRecente = (rows ?? []).reduce<NonNullable<typeof rows>[number] | null>(
    (atual, row) => (!atual || row.updated_at > atual.updated_at ? row : atual),
    null,
  );

  // d1_tma grava operator_email = email canônico do roster (minúsculo, ver
  // parse-tma-client.ts), então o match é por email normalizado.
  const emailsComLinha = new Set((rows ?? []).map((row) => row.operator_email.trim().toLowerCase()));
  const emailsRoster = new Set(roster);

  // Linha em d1_tma cujo operador NÃO está no roster do gestor: não deveria
  // acontecer, mas a linha é mantida (não perde dado) e só é sinalizada.
  if (emailsRoster.size > 0) {
    const foraDoRoster = doDia.filter((op) => !emailsRoster.has(op.operatorEmail.trim().toLowerCase()));
    if (foraDoRoster.length > 0) {
      // Só a contagem: e-mail de operador não vai pro log do servidor.
      console.warn(
        `[get-gestor-tma] ${foraDoRoster.length} linha(s) de d1_tma fora do roster do gestor ${gestorId}.`,
      );
    }
  }

  const doRosterSemLinha = Array.from(emailsRoster)
    .filter((email) => !emailsComLinha.has(email))
    .map(operadorSemLinha);

  // Mesmo critério de "sem dado" usado pela TmaTable (semDado). Ordem: quem
  // tem resultado primeiro (ordem de operator_email vinda do banco), quem não
  // tem por último (ordem do roster) — o "padrao" do ordenarOperadores do
  // Consolidado, que sempre empurra "sem resultado" pro fim.
  const semDado = (op: OperadorTma) => op.qtdAtendimentos === 0 || op.tmaSegundos === null;
  const todos = [...doDia, ...doRosterSemLinha];
  const emPadrao: OperadorTma[] = [...todos.filter((op) => !semDado(op)), ...todos.filter(semDado)];

  const ordemTabela =
    config?.ordem_tabela_tma && isOrdemTabelaTma(config.ordem_tabela_tma)
      ? config.ordem_tabela_tma
      : DEFAULT_ORDEM_TABELA_TMA;

  const operadores = ordenarOperadoresTma(emPadrao, ordemTabela);

  return {
    operadores,
    reportHora: maisRecente?.report_hora ?? null,
    reportDatasBase: maisRecente?.report_datas_base ?? null,
    reportNomeSupervisor: await resolveNomeSupervisorReportExibicao(admin, maisRecente?.report_nome_supervisor),
    // Sem meta (nem override nem default do KPI): campo vazio no popover, em
    // vez de um "13:00" que não estava valendo — a tabela fica neutra.
    metaAtualMmSs: threshold !== null ? segundosParaMmSs(threshold) : "",
    ordemTabela,
    thresholdConfig: { threshold, direction: thresholdConfig.direction },
    versaoBase: hashCurto(
      JSON.stringify({
        n: rows?.length ?? 0,
        u: maisRecente?.updated_at ?? null,
        r: roster,
        t: threshold,
        d: thresholdConfig.direction,
      }),
    ),
    erro: false,
  };
}
