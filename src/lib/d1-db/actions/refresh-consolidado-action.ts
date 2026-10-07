"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { resolverNomeExibicao } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import { getNomeFantasiaConfig } from "@/lib/gestor/nome-fantasia/get-config";
import { aplicarRvDiarioNaEquipe } from "@/lib/rv/calculate-rv-diario";
import { getCurrentPerUnitFaixas } from "@/lib/rv/get-current-per-unit-faixas";
import { getGestorConsolidado } from "../get-gestor-consolidado";
import type { OperadorConsolidado, ResumoEquipe } from "../types";
import {
  montarVersaoConsolidado,
  separarVersaoConsolidado,
  versaoExtrasConsolidado,
} from "../versao-consolidado";

type RefreshConsolidadoResult =
  | {
      success: true;
      semMudanca: false;
      operadores: OperadorConsolidado[];
      equipe: ResumoEquipe;
      nomeSupervisorReport: string | null;
      datasBaseReport: string[] | null;
      /** Versão completa (base|extras) — o cliente devolve no próximo poll. */
      versao: string;
      /** Só a parte da base (d1_consolidado + roster): muda = base nova pro Analítico. */
      versaoBase: string;
    }
  | { success: true; semMudanca: true }
  | { success: false };

/**
 * Refetch leve dos dados da tabela Consolidado/Equipe (operadores + hora/nome
 * do report), usado pelo polling de GestorEquipeSection.
 *
 * `versaoConhecida`: a versão que o cliente já tem ("base|extras", ver
 * versao-consolidado.ts). Responde `semMudanca` quando as duas partes
 * batem. Nome fantasia e faixas de RV são lidos em todo poll (consultas
 * pequenas, em paralelo com a base) — antes ficavam fora da versão e uma
 * mudança neles nunca chegava a uma aba aberta. Perfil e nome do supervisor
 * continuam só quando a base mudou.
 */
export async function refreshConsolidadoAction(
  versaoConhecida?: string,
): Promise<RefreshConsolidadoResult> {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "GESTOR") return { success: false };

  const conhecida = separarVersaoConsolidado(
    typeof versaoConhecida === "string" ? versaoConhecida : undefined,
  );

  const [primeiro, nomeFantasiaConfig, rvFaixas] = await Promise.all([
    getGestorConsolidado(user.profile.id, conhecida.base),
    getNomeFantasiaConfig(user.profile.id),
    getCurrentPerUnitFaixas(),
  ]);

  const extras = versaoExtrasConsolidado(nomeFantasiaConfig, rvFaixas);

  // Erro de banco: success false mantém a tabela que já está na tela (o
  // polling tenta de novo em 30s), em vez de trocá-la por tudo zerado.
  if (primeiro.erro) return { success: false };

  let resultado = primeiro;
  if (resultado.semMudanca) {
    if (extras === conhecida.extras) return { success: true, semMudanca: true };
    // Base igual, mas nome fantasia/RV mudaram: precisa das linhas de novo.
    resultado = await getGestorConsolidado(user.profile.id);
    if (resultado.erro) return { success: false };
  }

  const { data, reportHora, reportNomeSupervisor, reportDatasBase, versao } = resultado;

  // Equipe vazia (todo mundo removido do roster) é um resultado válido: a
  // tela passa a mostrar a equipe vazia. Antes virava success:false e o
  // cliente ficava com os operadores antigos indefinidamente.

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
    versao: montarVersaoConsolidado(versao, extras),
    versaoBase: versao,
  };
}
