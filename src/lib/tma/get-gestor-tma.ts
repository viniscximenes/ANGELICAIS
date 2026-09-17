import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { dataRefHojeBR } from "@/lib/d1-db/parse";

export type TmaStatus = "success" | "danger" | "neutral";

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
};

/** "MM:SS" -> segundos. Formato inválido/nulo -> null. */
function metaMmSsParaSegundos(meta: unknown): number | null {
  if (typeof meta !== "string") return null;
  const m = meta.trim().match(/^(\d{1,3}):(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

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

  const [{ data: rows, error }, { data: kpiDef }, { data: config }] = await Promise.all([
    admin
      .from("d1_tma")
      .select(
        "operator_email, qtd_atendimentos, tma_segundos, talk_medio_segundos, acw_medio_segundos, report_hora, report_nome_supervisor, qtd_outros, qtd_criticos, qtd_mud_endereco, qtd_financeiro, qtd_qualidade, qtd_concorrencia, qtd_hotline_churn",
      )
      .eq("gestor_id", gestorId)
      .eq("data_ref", dataRef)
      .order("operator_email", { ascending: true }),
    supabase.from("kpi_definitions").select("threshold_red, direction").eq("slug", "tma").maybeSingle(),
    supabase
      .from("gestor_config_fantasia")
      .select("kpi_gestor_metas")
      .eq("gestor_id", gestorId)
      .maybeSingle(),
  ]);

  if (error) {
    console.error("[get-gestor-tma] erro ao buscar d1_tma:", error.message);
  }

  const thresholdDefault = kpiDef?.threshold_red !== null && kpiDef?.threshold_red !== undefined
    ? Number(kpiDef.threshold_red)
    : null;
  const direction = kpiDef?.direction ?? "lower_better";

  const metasGestor = (config?.kpi_gestor_metas ?? {}) as Record<string, { meta?: unknown }>;
  const thresholdOverride = metaMmSsParaSegundos(metasGestor.tma?.meta);
  const threshold = thresholdOverride ?? thresholdDefault;

  function statusDe(valor: number | null): TmaStatus {
    if (valor === null || threshold === null) return "neutral";
    if (direction === "higher_better") return valor >= threshold ? "success" : "danger";
    return valor <= threshold ? "success" : "danger";
  }

  const operadores: OperadorTma[] = (rows ?? []).map((row) => ({
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
  }));

  return {
    operadores,
    reportHora: rows?.[0]?.report_hora ?? null,
    reportNomeSupervisor: rows?.[0]?.report_nome_supervisor ?? null,
    metaAtualMmSs: segundosParaMmSs(threshold ?? 731),
  };
}
