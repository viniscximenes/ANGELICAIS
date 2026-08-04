import { getRosterOperadoresGestor } from "@/lib/d1-db/get-roster-gestor";
import { deriveNomeOperador } from "@/lib/gestor/derive-nome-operador";
import { getKpiDefinitions } from "@/lib/kpi/get-definitions";
import { resolveKpiEmailCandidatesForProfiles } from "@/lib/profile/get-kpi-email-for-profile";
import { createClient } from "@/lib/supabase/server";

import {
  computeQuartis,
  getRanqueableSlugs,
} from "./compute-quartis";
import type { QuartilData } from "./compute-quartis";

/**
 * Quartil da equipe: calcula rank e quartil de cada operador DENTRO
 * do universo da própria equipe do gestor.
 *
 * Equipe = roster cadastrado em d1_operadores_gestor (Configurações →
 * Operadores do D-1), não mais o meta_gestor do KPI.
 *
 * Query: só a equipe × só os slugs ranqueáveis — bem abaixo do teto de 1000.
 */
export async function getQuartilEquipe(
  gestorId: string,
  mesRef: string,
): Promise<QuartilData> {
  const definitions = await getKpiDefinitions();
  const ranqueableSlugs = getRanqueableSlugs(definitions);

  const emailsOriginal = await getRosterOperadoresGestor(gestorId);
  if (emailsOriginal.length === 0) {
    return { operadores: [], mesRef, ranqueableSlugs };
  }

  // Candidatos por operador (email + variantes de domínio + alias de KPI +
  // variantes do alias) — mesma lógica de getKpiEquipePorEmails: consulta
  // TODOS de uma vez em vez de tentar adivinhar de antemão qual email "é o
  // certo" pra este mês.
  const candidatosMap = await resolveKpiEmailCandidatesForProfiles(emailsOriginal);
  const todosCandidatos = [
    ...new Set(
      emailsOriginal.flatMap(
        (e) => candidatosMap.get(e.trim().toLowerCase()) ?? [e.trim().toLowerCase()],
      ),
    ),
  ];

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("kpi_monthly_snapshots")
    .select("operator_email, kpi_slug, valor_numerico, data_corte")
    .eq("mes_ref", mesRef)
    .in("operator_email", todosCandidatos)
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

  // Agrupar por emailOriginal — cada linha vem com o email de algum
  // candidato (principal, alias, ou variante de domínio de qualquer um);
  // rowsByCandidato guarda por esse email bruto, e cada operador consolida
  // as linhas de TODOS os seus candidatos.
  const rowsByCandidato = new Map<
    string,
    { kpi_slug: string; valor_numerico: number | null }[]
  >();
  for (const row of rows ?? []) {
    const key = row.operator_email.toLowerCase();
    if (!rowsByCandidato.has(key)) rowsByCandidato.set(key, []);
    rowsByCandidato.get(key)!.push(row);
  }

  const valoresPorEmail = new Map<string, Map<string, number | null>>();
  for (const emailOriginal of emailsOriginal) {
    const emailNorm = emailOriginal.trim().toLowerCase();
    const candidatos = candidatosMap.get(emailNorm) ?? [emailNorm];
    const valores = new Map(ranqueableSlugs.map((s) => [s, null as number | null]));
    for (const candidato of candidatos) {
      for (const row of rowsByCandidato.get(candidato) ?? []) {
        if (row.valor_numerico !== null) {
          valores.set(row.kpi_slug, Number(row.valor_numerico));
        }
      }
    }
    valoresPorEmail.set(emailOriginal, valores);
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
