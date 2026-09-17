"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { resolverNomeExibicao } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import { getNomeFantasiaConfig } from "@/lib/gestor/nome-fantasia/get-config";
import { getGestorTma } from "../get-gestor-tma";
import { getGestorTmaAtendimentos } from "../get-gestor-tma-atendimentos";
import type { TmaLinha } from "@/components/tma/tma-table";
import type { AtendimentoTma } from "../get-gestor-tma-atendimentos";

type RefreshTmaResult =
  | {
      success: true;
      linhas: TmaLinha[];
      atendimentosPorOperador: Record<string, AtendimentoTma[]>;
      reportHora: string;
      reportNomeSupervisor: string | null;
      metaAtualMmSs: string;
    }
  | { success: false };

/** Refetch leve da tabela TMA, usado pelo polling e pelo ClearBaseButton. */
export async function refreshTmaAction(): Promise<RefreshTmaResult> {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "GESTOR") return { success: false };

  const [{ operadores, reportHora, reportNomeSupervisor, metaAtualMmSs }, nomeFantasiaConfig, atendimentosMap] =
    await Promise.all([
      getGestorTma(user.profile.id),
      getNomeFantasiaConfig(user.profile.id),
      getGestorTmaAtendimentos(user.profile.id),
    ]);

  const nomeFantasia = {
    ativo: nomeFantasiaConfig.ativo,
    mapa: Object.fromEntries(nomeFantasiaConfig.mapa),
  };

  const linhas: TmaLinha[] = operadores.map((op) => ({
    ...op,
    nomeExibicao: resolverNomeExibicao(op.operatorEmail, nomeFantasia),
  }));

  return {
    success: true,
    linhas,
    atendimentosPorOperador: Object.fromEntries(atendimentosMap),
    reportHora: reportHora ?? "—",
    reportNomeSupervisor,
    metaAtualMmSs,
  };
}
