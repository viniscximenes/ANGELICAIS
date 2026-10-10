"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getRosterOperadoresGestorOuErro } from "@/lib/d1-db/get-roster-gestor";
import { getGestorTma, type OperadorTma } from "../get-gestor-tma";
import { getGestorTmaAnalitico, type GestorTmaAnaliticoResult } from "../get-gestor-tma-analitico";

type RefreshAnaliticoTmaResult =
  | {
      success: true;
      analitico: GestorTmaAnaliticoResult;
      operadores: OperadorTma[];
      roster: string[];
    }
  | { success: false };

/**
 * Recarrega o bloco Analítico do TMA sem F5 — chamado por AnaliticoTmaSection
 * quando a tabela avisa que a base mudou (polling com versão nova, "Limpar
 * Base" ou meta salva). Mesmo papel do fetchDashboardRetencaoAction no
 * Analítico do Consolidado. Antes o Analítico só vinha no carregamento da
 * página e ficava com a base antiga enquanto a tabela já mostrava a nova.
 */
export async function refreshAnaliticoTmaAction(): Promise<RefreshAnaliticoTmaResult> {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "GESTOR") return { success: false };

  const [analitico, tma, roster] = await Promise.all([
    getGestorTmaAnalitico(user.profile.id),
    getGestorTma(user.profile.id),
    getRosterOperadoresGestorOuErro(user.profile.id).catch(() => null),
  ]);

  if (analitico.erro || tma.erro || roster === null) return { success: false };

  return { success: true, analitico, operadores: tma.operadores, roster };
}
