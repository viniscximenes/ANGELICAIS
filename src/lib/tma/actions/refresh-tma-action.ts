"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { resolverNomeExibicao } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import { getNomeFantasiaConfig } from "@/lib/gestor/nome-fantasia/get-config";
import { getGestorTma } from "../get-gestor-tma";
import type { TmaLinha } from "@/components/tma/tma-table";
import type { OrdemTabelaTma } from "@/lib/gestor/config-tabela-tma/types";
import type { TmaThresholdConfig } from "../tma-status";

type RefreshTmaResult =
  | {
      success: true;
      linhas: TmaLinha[];
      reportHora: string;
      reportNomeSupervisor: string | null;
      /** Dias (YYYY-MM-DD) da base do último upload — d1_tma.report_datas_base. */
      datasBaseReport: string[] | null;
      metaAtualMmSs: string;
      ordemTabela: OrdemTabelaTma;
      /** Meta efetiva — o modal do operador usa a mesma que coloriu a tabela. */
      thresholdConfig: TmaThresholdConfig;
      /** Versão da base (getGestorTma) — muda quando entra/sai base; o client avisa o Analítico. */
      versaoBase: string;
    }
  | { success: false };

/** Refetch leve da tabela TMA, usado pelo polling, pelo "Limpar Base" e após salvar as configurações. */
export async function refreshTmaAction(): Promise<RefreshTmaResult> {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "GESTOR") return { success: false };

  // Sem os atendimentos (com telefone de cliente): o modal busca os do
  // operador só ao abrir (getAtendimentosOperadorTmaAction). Antes iam os da
  // equipe inteira a cada 30s.
  const [tma, nomeFantasiaConfig] = await Promise.all([
    getGestorTma(user.profile.id),
    getNomeFantasiaConfig(user.profile.id),
  ]);

  // Falha ao ler o nome fantasia: success false mantém a tabela que já está
  // na tela (o polling tenta de novo em 30s). O fallback (ativo=false)
  // recalcularia os nomes REAIS e os mostraria — inclusive no "Copiar
  // imagem" — sem ação do gestor. Mesma regra do refreshConsolidadoAction.
  // Mesmo para erro de banco na tabela: antes a tabela inteira era trocada
  // por tudo zerado.
  if (nomeFantasiaConfig.erro || tma.erro) return { success: false };

  const { operadores, reportHora, reportNomeSupervisor, reportDatasBase, metaAtualMmSs, ordemTabela, thresholdConfig, versaoBase } = tma;

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
    reportHora: reportHora ?? "—",
    reportNomeSupervisor,
    datasBaseReport: reportDatasBase,
    metaAtualMmSs,
    ordemTabela,
    thresholdConfig,
    versaoBase,
  };
}
