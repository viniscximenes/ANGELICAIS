import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { dataRefHojeBR } from "@/lib/d1-db/parse";
import { getRosterOperadoresGestor } from "@/lib/d1-db/get-roster-gestor";
import { DEFAULT_ORDEM_TABELA_TMA, isOrdemTabelaTma, type OrdemTabelaTma } from "@/lib/gestor/config-tabela-tma/types";
import { ordenarOperadoresTma } from "@/lib/gestor/config-tabela-tma/ordenar-operadores-tma";
import { getTmaThresholdConfig, statusTmaDe, type TmaStatus } from "./tma-status";

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
  /** Meta efetiva usada pra colorir (override do gestor ou default do KPI), em "MM:SS". */
  metaAtualMmSs: string;
  /** Ordenação salva do gestor — `gestor_config_fantasia.ordem_tabela_tma`. */
  ordemTabela: OrdemTabelaTma;
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
  const supabase = await createClient();
  const dataRef = dataRefHojeBR();

  const [{ data: rows, error }, thresholdConfig, { data: config }, roster] = await Promise.all([
    admin
      .from("d1_tma")
      .select(
        "operator_email, qtd_atendimentos, tma_segundos, talk_medio_segundos, acw_medio_segundos, report_hora, report_nome_supervisor, qtd_outros, qtd_criticos, qtd_mud_endereco, qtd_financeiro, qtd_qualidade, qtd_concorrencia, qtd_hotline_churn",
      )
      .eq("gestor_id", gestorId)
      .eq("data_ref", dataRef)
      .order("operator_email", { ascending: true }),
    getTmaThresholdConfig(gestorId),
    supabase
      .from("gestor_config_fantasia")
      .select("ordem_tabela_tma")
      .eq("gestor_id", gestorId)
      .maybeSingle(),
    getRosterOperadoresGestor(gestorId),
  ]);

  if (error) {
    console.error("[get-gestor-tma] erro ao buscar d1_tma:", error.message);
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

  // d1_tma grava operator_email = email canônico do roster (minúsculo, ver
  // parse-tma-client.ts), então o match é por email normalizado.
  const emailsComLinha = new Set((rows ?? []).map((row) => row.operator_email.trim().toLowerCase()));
  const emailsRoster = new Set(roster);

  // Linha em d1_tma cujo operador NÃO está no roster do gestor: não deveria
  // acontecer, mas a linha é mantida (não perde dado) e só é sinalizada.
  if (emailsRoster.size > 0) {
    const foraDoRoster = doDia.filter((op) => !emailsRoster.has(op.operatorEmail.trim().toLowerCase()));
    if (foraDoRoster.length > 0) {
      console.warn(
        `[get-gestor-tma] ${foraDoRoster.length} linha(s) de d1_tma fora do roster do gestor ${gestorId}: ${foraDoRoster
          .map((op) => op.operatorEmail)
          .join(", ")}`,
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
    reportHora: rows?.[0]?.report_hora ?? null,
    reportNomeSupervisor: rows?.[0]?.report_nome_supervisor ?? null,
    metaAtualMmSs: segundosParaMmSs(threshold ?? 731),
    ordemTabela,
  };
}
