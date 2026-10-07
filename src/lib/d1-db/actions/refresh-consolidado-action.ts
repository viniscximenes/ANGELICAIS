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
      semMudanca: false;
      operadores: OperadorConsolidado[];
      equipe: ResumoEquipe;
      nomeSupervisorReport: string | null;
      datasBaseReport: string[] | null;
      versao: string;
    }
  | { success: true; semMudanca: true }
  | { success: false };

/**
 * Refetch leve dos dados da tabela Consolidado/Equipe (operadores + hora/nome
 * do report), usado pelo polling de GestorEquipeSection.
 *
 * `versaoConhecida`: a versão que o cliente já tem (ver
 * GestorConsolidadoResult.versao). Se nada mudou, responde `semMudanca` só
 * com as consultas de roster + base — sem perfil, nome do supervisor, nome
 * fantasia e faixas de RV (antes eram ~8 consultas a cada 30s por aba).
 */
export async function refreshConsolidadoAction(
  versaoConhecida?: string,
): Promise<RefreshConsolidadoResult> {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "GESTOR") return { success: false };

  const resultado = await getGestorConsolidado(
    user.profile.id,
    typeof versaoConhecida === "string" ? versaoConhecida : undefined,
  );
  const { data, reportHora, reportNomeSupervisor, reportDatasBase, erro, versao } = resultado;

  // Erro de banco: success false mantém a tabela que já está na tela (o
  // polling tenta de novo em 30s), em vez de trocá-la por tudo zerado.
  if (erro) return { success: false };
  if (resultado.semMudanca) return { success: true, semMudanca: true };
  if (data.operadores.length === 0) return { success: false };

  const [nomeFantasiaConfig, rvFaixas] = await Promise.all([
    getNomeFantasiaConfig(user.profile.id),
    getCurrentPerUnitFaixas(),
  ]);

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

  return {
    success: true,
    semMudanca: false,
    operadores,
    equipe,
    nomeSupervisorReport: reportNomeSupervisor,
    datasBaseReport: reportDatasBase,
    versao,
  };
}
