"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getNomeFantasiaConfig } from "@/lib/gestor/nome-fantasia/get-config";
import { getCurrentPerUnitFaixas } from "@/lib/rv/get-current-per-unit-faixas";
import { getGestorConsolidado } from "../get-gestor-consolidado";
import { montarTabelaConsolidado } from "../montar-tabela-consolidado";
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
 *
 * CUSTO POR CICLO É INTENCIONAL (auditoria 2026-10-07): sem mudança, um
 * ciclo faz roster + checagem leve da versão (só updated_at) + nome fantasia
 * + faixas de RV, em paralelo, mais as 2 chamadas ao Auth (middleware +
 * getCurrentUser). As de Auth são da sessão do app inteiro, não desta tela.
 * Nome fantasia/RV entram de propósito: sem eles a aba aberta mostrava
 * nomes e valores de RV antigos. O polling já pausa com a aba oculta e não
 * sobrepõe buscas (GestorEquipeSection).
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

  // Mesma conversão da carga inicial (page.tsx).
  const { operadores, equipe } = montarTabelaConsolidado({
    linhas: data.operadores,
    consolidado: data.consolidado,
    reportHora,
    nomeFantasia,
    rvFaixas,
  });

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
