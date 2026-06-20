import { deriveNomeOperador } from "@/lib/gestor/derive-nome-operador";
import { getKpiDefinitions } from "@/lib/kpi/get-definitions";
import { resolveKpiEmailsForProfiles } from "@/lib/profile/get-kpi-email-for-profile";
import { createClient } from "@/lib/supabase/server";

import {
  computeQuartis,
  getRanqueableSlugs,
} from "./compute-quartis";
import type { QuartilData } from "./compute-quartis";
import { getOperadoresDoGestor } from "./get-operadores-do-gestor";

/**
 * Quartil da equipe: calcula rank e quartil de cada operador DENTRO
 * do universo da própria equipe do gestor.
 *
 * Query: só a equipe × só os slugs ranqueáveis — bem abaixo do teto de 1000.
 */
export async function getQuartilEquipe(
  fullName: string,
  mesRef: string,
): Promise<QuartilData> {
  const definitions = await getKpiDefinitions();
  const ranqueableSlugs = getRanqueableSlugs(definitions);

  const emailsOriginal = await getOperadoresDoGestor(fullName, mesRef);
  if (emailsOriginal.length === 0) {
    return { operadores: [], mesRef, ranqueableSlugs };
  }

  const aliasMap = await resolveKpiEmailsForProfiles(emailsOriginal);
  const emailsResolvidos = [...new Set([...aliasMap.values()])];

  // Mapa inverso kpiEmail → emailOriginal
  const kpiToOriginal = new Map<string, string>();
  for (const [orig, kpi] of aliasMap.entries()) {
    if (!kpiToOriginal.has(kpi)) kpiToOriginal.set(kpi, orig);
  }

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("kpi_monthly_snapshots")
    .select("operator_email, kpi_slug, valor_numerico, data_corte")
    .eq("mes_ref", mesRef)
    .in("operator_email", emailsResolvidos)
    .in("kpi_slug", ranqueableSlugs);

  if (error) {
    console.error("[getQuartilEquipe] erro:", {
      message: error.message,
      code: error.code,
    });
    return { operadores: [], mesRef, ranqueableSlugs };
  }

  const dataCorte =
    [...(rows ?? [])]
      .map((r) => r.data_corte as string | null)
      .filter((v): v is string => Boolean(v))
      .sort()
      .reverse()[0] ?? null;

  // Agrupar por emailOriginal
  const valoresPorEmail = new Map<string, Map<string, number | null>>();
  for (const email of emailsOriginal) {
    valoresPorEmail.set(email, new Map(ranqueableSlugs.map((s) => [s, null])));
  }

  for (const row of rows ?? []) {
    const emailKpi = row.operator_email.toLowerCase();
    const emailOrig = kpiToOriginal.get(emailKpi) ?? emailKpi;
    if (valoresPorEmail.has(emailOrig) && row.valor_numerico !== null) {
      valoresPorEmail.get(emailOrig)!.set(row.kpi_slug, Number(row.valor_numerico));
    }
  }

  const operadoresParaQuartil = emailsOriginal.map((email) => ({
    email,
    valores: valoresPorEmail.get(email)!,
  }));

  const quartisMap = computeQuartis(operadoresParaQuartil, definitions);

  const operadores = emailsOriginal
    .map((email) => ({
      email,
      nome: deriveNomeOperador(email),
      valores: valoresPorEmail.get(email)!,
      quartis: quartisMap.get(email) ?? new Map(),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  return { operadores, mesRef, ranqueableSlugs, dataCorte };
}
