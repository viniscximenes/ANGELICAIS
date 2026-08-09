"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getEmailsEquipe } from "./get-emails-equipe";
import { getVisaoGeral, type VisaoGeralData } from "./get-visao-geral";
import { getEvolucaoHora, type HoraEvolucaoData } from "./get-evolucao-hora";
import { getPorTema, type TemaData } from "./get-por-tema";
import { getPorSegmento, type SegmentoResult } from "./get-por-segmento";
import { getQuartilOperadores, type OperadorQuartilItem } from "./get-quartil-operadores";
import {
  montarQuartilPorOperador,
  type QuartilOperador,
} from "./get-quartil-operador";
import { getMatrizVolumeTaxa, type MatrizResult } from "./get-matriz-volume-taxa";
import { getMetaTxRetencao, salvarMetaTxRetencao } from "./meta";
import {
  getContratosFiltrados,
  type FiltroContratos,
  type ContratoFiltradoItem,
} from "./get-contratos-filtrados";
import {
  getPorOperadorIndividual,
  type OperadorIndividual,
} from "./get-por-operador-individual";
import { getNomeFantasiaConfig } from "@/lib/gestor/nome-fantasia/get-config";
import type { NomeFantasiaSerial } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import type { ContribItem } from "./get-contribuicao-queda";
import { getGestorConsolidado } from "@/lib/d1-db/get-gestor-consolidado";

/**
 * Shape do bloco "Histórico De Quedas". O bloco foi retirado da tela, então
 * a action não busca mais esses dados — o tipo continua exportado porque
 * `lista-quedas.tsx` foi mantido como referência e ainda o consome.
 */
export type QuedaComContribuicao = {
  horaAnterior: number;
  hora: number;
  labelAnterior: string;
  label: string;
  txAnterior: number;
  txAtual: number;
  quedaPontos: number;
  porMotivo: ContribItem[];
  porOperador: ContribItem[];
};

export type DashboardRetencaoResult = {
  success: boolean;
  data?: {
    visaoGeral: VisaoGeralData;
    porTema: TemaData[];
    evolucaoHora: HoraEvolucaoData[];
    porSegmento: SegmentoResult;
    quartilOperadores: OperadorQuartilItem[];
    quartilPolo: OperadorQuartilItem[];
    matriz: MatrizResult;
    /** Análise individual por operador (lista + detalhe do popup). */
    operadoresIndividual: OperadorIndividual[];
    /** Quartil de cada operador (equipe e empresa), indexado por prefixo do email. */
    quartilPorOperador: Record<string, QuartilOperador>;
    /** Config de apelidos do gestor, para resolver o nome exibido. */
    nomeFantasia: NomeFantasiaSerial;
    meta: number; // Meta de 0 a 100
    emailsEquipe: string[];
    reportHora?: string | null;
  };
  error?: string;
};

/**
 * Dados consolidados do dashboard de retenção.
 *
 * Sempre no escopo da EQUIPE do gestor e sempre no DIA INTEIRO — os toggles
 * de Equipe/Polo e de turno/hora foram removidos da tela.
 *
 * A única consulta que ainda roda no escopo do polo é `quartilPolo`: ela
 * posiciona os operadores da equipe dentro do ranking do polo inteiro, que é
 * o que o bloco de Distribuição por Quartil compara.
 */
export async function fetchDashboardRetencaoAction(): Promise<DashboardRetencaoResult> {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "GESTOR") {
    return { success: false, error: "Acesso não autorizado." };
  }

  try {
    const id = user.profile.username || user.profile.emailCorporativo;
    const emailsEquipe = await getEmailsEquipe(id);

    // Carrega a meta customizada do gestor logado
    const meta = await getMetaTxRetencao(user.profile.id);

    const [
      visaoGeral,
      porTema,
      evolucaoHora,
      porSegmento,
      quartilOperadores,
      quartilPoloAll,
      matriz,
      operadoresIndividual,
      nomeFantasiaConfig,
      gestorConsolidado,
    ] = await Promise.all([
      getVisaoGeral(emailsEquipe),
      getPorTema(emailsEquipe),
      getEvolucaoHora(emailsEquipe),
      getPorSegmento(emailsEquipe),
      getQuartilOperadores("equipe", emailsEquipe),
      getQuartilOperadores("empresa", []),
      getMatrizVolumeTaxa(emailsEquipe),
      getPorOperadorIndividual(emailsEquipe),
      getNomeFantasiaConfig(user.profile.id),
      getGestorConsolidado(user.profile.id),
    ]);

    // Operadores da equipe, mas com o rank/quartil calculado sobre o polo.
    const teamEmailsLower = emailsEquipe.map((e) => e.toLowerCase().trim());
    // Antes de recortar o polo para a equipe: o card de quartil precisa do
    // ranking COMPLETO da empresa para mostrar "45/142".
    const quartilPorOperador = montarQuartilPorOperador(
      quartilOperadores,
      quartilPoloAll,
    );

    const quartilPolo = quartilPoloAll.filter((op: OperadorQuartilItem) =>
      teamEmailsLower.includes(op.login.toLowerCase().trim()),
    );

    return {
      success: true,
      data: {
        visaoGeral,
        porTema,
        evolucaoHora,
        porSegmento,
        quartilOperadores,
        quartilPolo,
        matriz,
        operadoresIndividual,
        quartilPorOperador,
        nomeFantasia: {
          ativo: nomeFantasiaConfig.ativo,
          mapa: Object.fromEntries(nomeFantasiaConfig.mapa),
        },
        meta,
        emailsEquipe,
        reportHora: gestorConsolidado.reportHora,
      },
    };
  } catch (err) {
    console.error("[fetchDashboardRetencaoAction] erro de consulta:", err);
    return {
      success: false,
      error: "Ocorreu um erro ao processar os dados analíticos de retenção.",
    };
  }
}

/**
 * Server Action para atualizar a meta de taxa de retenção do gestor.
 */
export async function saveMetaAction(
  valor: number,
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "GESTOR") {
    return { success: false, error: "Acesso não autorizado." };
  }

  try {
    return await salvarMetaTxRetencao(user.profile.id, valor);
  } catch (err) {
    console.error("[saveMetaAction] erro ao atualizar meta:", err);
    return { success: false, error: "Erro inesperado ao salvar a meta." };
  }
}

export async function fetchContratosFiltradosAction(
  filtros: Omit<FiltroContratos, "emailsEquipe">
): Promise<{ success: boolean; data?: ContratoFiltradoItem[]; error?: string }> {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "GESTOR") {
    return { success: false, error: "Acesso não autorizado." };
  }

  try {
    const id = user.profile.username || user.profile.emailCorporativo;
    const emailsEquipe = await getEmailsEquipe(id);
    const data = await getContratosFiltrados({
      ...filtros,
      emailsEquipe,
    });
    return { success: true, data };
  } catch (err) {
    console.error("[fetchContratosFiltradosAction] erro ao buscar contratos:", err);
    return { success: false, error: "Erro ao consultar contratos." };
  }
}
