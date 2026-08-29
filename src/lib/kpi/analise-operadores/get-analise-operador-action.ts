"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getRosterOperadoresGestor } from "@/lib/d1-db/get-roster-gestor";
import { getSnapshotsSummary } from "@/lib/kpi/bases/get-snapshots-summary";
import { resolveKpiEmailCandidatesForProfiles } from "@/lib/profile/get-kpi-email-for-profile";

import { isPeriodo, type Periodo } from "./periodo";
import {
  buildAnaliseOperadorSerial,
  type AnaliseOperadorSerial,
} from "./serial-types";

type GetAnaliseOperadorResult =
  | { success: true; data: AnaliseOperadorSerial }
  | { success: false; error: string };

/**
 * Carrega o relatório de performance histórica de um operador (KPIs mensais
 * + quartil por mês). Chamada sob demanda ao trocar operador/período em
 * /operacao/analise-operadores.
 *
 * O operador precisa estar no roster do gestor logado
 * (d1_operadores_gestor) — não basta existir snapshot de KPI pra ele.
 */
export async function getAnaliseOperadorAction(input: {
  operatorEmail: string;
  periodo: string;
  /** default true — inclui o mês calendário corrente (ainda não fechado). */
  incluirMesAtual?: boolean;
}): Promise<GetAnaliseOperadorResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (user.profile.role !== "GESTOR") {
    return { success: false, error: "Sem permissão" };
  }

  if (!isPeriodo(input.periodo)) {
    return { success: false, error: "Período inválido" };
  }
  const periodo: Periodo = input.periodo;

  const operatorEmail = input.operatorEmail.trim().toLowerCase();
  if (!operatorEmail) {
    return { success: false, error: "Operador não informado" };
  }

  const roster = await getRosterOperadoresGestor(user.profile.id);
  if (!roster.includes(operatorEmail)) {
    return { success: false, error: "Operador fora da equipe" };
  }

  const [candidatosMap, summary] = await Promise.all([
    resolveKpiEmailCandidatesForProfiles([operatorEmail]),
    getSnapshotsSummary(),
  ]);

  const operatorEmailCandidates =
    candidatosMap.get(operatorEmail) ?? [operatorEmail];
  const mesMaisRecenteDisponivel = summary[0]?.mesRef ?? null;

  const data = await buildAnaliseOperadorSerial({
    operatorEmailCandidates,
    periodo,
    mesMaisRecenteDisponivel,
    incluirMesAtual: input.incluirMesAtual ?? true,
  });

  return { success: true, data };
}
