"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { resolverNomeExibicao } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import { getNomeFantasiaConfig } from "@/lib/gestor/nome-fantasia/get-config";
import { aplicarRvDiarioNaEquipe } from "@/lib/rv/calculate-rv-diario";
import { getCurrentPerUnitFaixas } from "@/lib/rv/get-current-per-unit-faixas";
import { getGestorConsolidado } from "../get-gestor-consolidado";
import type { OperadorConsolidado, ResumoEquipe } from "../types";

type RefreshConsolidadoResult =
  | {
      success: true;
      operadores: OperadorConsolidado[];
      equipe: ResumoEquipe;
      nomeSupervisorReport: string | null;
    }
  | { success: false };

/**
 * Refetch leve dos dados da tabela Consolidado/Equipe (operadores + hora/nome
 * do report), usado pelo polling de GestorEquipeSection.
 */
export async function refreshConsolidadoAction(): Promise<RefreshConsolidadoResult> {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "GESTOR") return { success: false };

  const [{ data, reportHora, reportNomeSupervisor }, nomeFantasiaConfig, rvFaixas] = await Promise.all([
    getGestorConsolidado(user.profile.id),
    getNomeFantasiaConfig(user.profile.id),
    getCurrentPerUnitFaixas(),
  ]);

  if (data.operadores.length === 0) return { success: false };

  const nomeFantasia = {
    ativo: nomeFantasiaConfig.ativo,
    mapa: Object.fromEntries(nomeFantasiaConfig.mapa),
  };

  const operadoresSemRv: OperadorConsolidado[] = data.operadores.map((op) => ({
    email: resolverNomeExibicao(op.nome.trim().toLowerCase(), nomeFantasia),
    emailOriginal: op.nome.trim().toLowerCase(),
    supervisor: op.gestora,
    retidos: op.retidos,
    cancelados: op.cancelados,
    pedidos: op.pedidos,
    txRetencao: op.txRetencao,
  }));

  const { operadores, rvDiarioEquipe } = aplicarRvDiarioNaEquipe(operadoresSemRv, rvFaixas);

  const equipe: ResumoEquipe = {
    retidos: data.consolidado.retidos,
    cancelados: data.consolidado.cancelados,
    pedidos: data.consolidado.pedidos,
    txRetencao: data.consolidado.txRetencao,
    horaReport: reportHora ?? "—",
    rvDiario: rvDiarioEquipe,
  };

  return { success: true, operadores, equipe, nomeSupervisorReport: reportNomeSupervisor };
}
