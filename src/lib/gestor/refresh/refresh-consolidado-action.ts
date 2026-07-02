"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getNomeFantasiaConfig } from "@/lib/gestor/nome-fantasia/get-config";
import { resolverNomeExibicao } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import type { OperadorConsolidado, ResumoEquipe } from "@/lib/google/d1";
import { fetchUltimoReportInfo } from "@/lib/google/d1/upload";
import { fetchGestorData, resolveGuiaGestor } from "@/lib/google/gestor";

export type RefreshConsolidadoResult =
  | {
      success: true;
      operadores: OperadorConsolidado[];
      equipe: ResumoEquipe;
      nomeSupervisorReport: string | null;
    }
  | { success: false };

/**
 * Refetch leve dos dados da tabela Consolidado/Equipe (operadores + hora/nome
 * do report), usado pelo polling de GestorEquipeSection. Espelha a lógica de
 * carregamento de src/app/(dashboard)/gestor/d-1/page.tsx.
 */
export async function refreshConsolidadoAction(): Promise<RefreshConsolidadoResult> {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "GESTOR") return { success: false };

  const guia =
    resolveGuiaGestor(user.profile.username) ??
    resolveGuiaGestor(user.profile.emailCorporativo);
  if (!guia) return { success: false };

  const [data, reportInfo, nomeFantasiaConfig] = await Promise.all([
    fetchGestorData(guia),
    fetchUltimoReportInfo(),
    getNomeFantasiaConfig(user.profile.id),
  ]);

  if (data.operadores.length === 0) return { success: false };

  const nomeFantasia = {
    ativo: nomeFantasiaConfig.ativo,
    mapa: Object.fromEntries(nomeFantasiaConfig.mapa),
  };

  const operadores: OperadorConsolidado[] = data.operadores.map((op) => ({
    email: resolverNomeExibicao(op.nome.trim().toLowerCase(), nomeFantasia),
    emailOriginal: op.nome.trim().toLowerCase(),
    supervisor: op.gestora,
    retidos: op.retidos,
    cancelados: op.cancelados,
    pedidos: op.pedidos,
    txRetencao: op.txRetencao,
  }));

  const equipe: ResumoEquipe = {
    retidos: data.consolidado.retidos,
    cancelados: data.consolidado.cancelados,
    pedidos: data.consolidado.pedidos,
    txRetencao: data.consolidado.txRetencao,
    horaReport: reportInfo.hora ?? "—",
  };

  return {
    success: true,
    operadores,
    equipe,
    nomeSupervisorReport: reportInfo.nomeSupervisor,
  };
}
