import { getRosterOperadoresGestor } from "@/lib/d1-db/get-roster-gestor";
import { formatKpiValue } from "@/lib/kpi/atual/format-kpi-value";
import { resolveKpiEmailCandidatesForProfiles } from "@/lib/profile/get-kpi-email-for-profile";
import { createClient } from "@/lib/supabase/server";

import { avaliarMetaGestor, type MetaGestorConfig } from "./avaliar-meta-gestor";
import { KPI_GESTOR_CARDS } from "./kpi-gestor-cards-config";

export type DefasadoGestorInfo = {
  temMeta: boolean;
  defasados: { user: string; valor: string }[];
  /** Operadores da equipe com dado nesse KPI/mês (denominador do "3 de N"). */
  totalOperadores: number;
};

/**
 * Pra cada card de /kpi/gestor com meta configurada, lista os operadores da
 * equipe do gestor (roster de d1_operadores_gestor) fora dessa meta no mês —
 * usado no hover/tooltip dos cards. Fonte: kpi_monthly_snapshots (nível
 * operador), avaliado com a MESMA meta configurada pro gestor.
 */
export async function getDefasadosGestorPorKpi(
  gestorId: string,
  mesRef: string,
  metas: Record<string, MetaGestorConfig>,
): Promise<Record<string, DefasadoGestorInfo>> {
  const result: Record<string, DefasadoGestorInfo> = {};
  for (const card of KPI_GESTOR_CARDS) {
    result[card.configSlug] = {
      temMeta: Boolean(metas[card.configSlug]?.direcao),
      defasados: [],
      totalOperadores: 0,
    };
  }

  const emailsRoster = await getRosterOperadoresGestor(gestorId);
  if (emailsRoster.length === 0) return result;

  const candidatosMap = await resolveKpiEmailCandidatesForProfiles(emailsRoster);
  const todosCandidatos = [
    ...new Set(emailsRoster.flatMap((e) => candidatosMap.get(e) ?? [e])),
  ];

  const slugsNecessarios = [
    ...new Set([...KPI_GESTOR_CARDS.map((c) => c.dataSlug), "forecast_churn", "tx_retencao_bruta"]),
  ];

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("kpi_monthly_snapshots")
    .select("operator_email, kpi_slug, valor_numerico")
    .eq("mes_ref", mesRef)
    .in("operator_email", todosCandidatos)
    .in("kpi_slug", slugsNecessarios);

  if (error) {
    console.error("[getDefasadosGestorPorKpi] erro:", error.message);
    return result;
  }

  const rowsByEmail = new Map<string, Map<string, number | null>>();
  for (const row of rows ?? []) {
    const key = row.operator_email.toLowerCase();
    if (!rowsByEmail.has(key)) rowsByEmail.set(key, new Map());
    if (row.valor_numerico !== null) {
      rowsByEmail.get(key)!.set(row.kpi_slug, Number(row.valor_numerico));
    }
  }

  for (const card of KPI_GESTOR_CARDS) {
    const config = metas[card.configSlug];
    if (!config?.direcao) continue;

    const piores: { user: string; valor: number }[] = [];
    let totalComDado = 0;

    for (const emailOriginal of emailsRoster) {
      const candidatos = candidatosMap.get(emailOriginal) ?? [emailOriginal];

      // Consolida valores de TODOS os candidatos (variantes de domínio +
      // alias) — o mesmo operador pode ter dado de meses diferentes sob
      // emails diferentes (ver resolveKpiEmailCandidatesForProfiles).
      const valoresOperador = new Map<string, number | null>();
      for (const c of candidatos) {
        const m = rowsByEmail.get(c);
        if (m) for (const [slug, v] of m) valoresOperador.set(slug, v);
      }
      if (valoresOperador.size === 0) continue;

      const valor = valoresOperador.get(card.dataSlug) ?? null;
      if (valor === null) continue;
      totalComDado++;

      const status = avaliarMetaGestor(
        valor,
        config,
        {
          forecastChurn: valoresOperador.get("forecast_churn") ?? null,
          txRetencaoBruta: valoresOperador.get("tx_retencao_bruta") ?? null,
        },
        card.valueType,
      );

      if (status === "danger") {
        piores.push({ user: emailOriginal.split("@")[0], valor });
      }
    }

    // Pior primeiro: lte → maior valor é pior (desc); demais → menor é pior (asc).
    piores.sort((a, b) => (config.direcao === "lte" ? b.valor - a.valor : a.valor - b.valor));

    result[card.configSlug] = {
      temMeta: true,
      defasados: piores.map((p) => ({ user: p.user, valor: formatKpiValue(p.valor, card.valueType) })),
      totalOperadores: totalComDado,
    };
  }

  return result;
}
