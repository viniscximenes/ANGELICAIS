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
  quartilDoOperador,
  type QuartilOperador,
} from "./get-quartil-operador";
import { getEmailPrefix } from "@/lib/utils/email-variants";
import { getMatrizVolumeTaxa, type MatrizResult } from "./get-matriz-volume-taxa";
import { getMetaTxRetencao } from "./meta";
import {
  getContratosFiltrados,
  type FiltroContratos,
  type ContratoFiltradoItem,
} from "./get-contratos-filtrados";
import {
  getPorOperadorIndividual,
  type OperadorIndividual,
} from "./get-por-operador-individual";
import { getImpactoFaceId, type ImpactoFaceIdData } from "./get-impacto-faceid";
import { getEfetividadeArgumento, type ArgumentoItem } from "./get-efetividade-argumento";
import { getNomeFantasiaConfig } from "@/lib/gestor/nome-fantasia/get-config";
import type { NomeFantasiaSerial } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";

type DashboardRetencaoResult = {
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
    /** Card "Impacto do Face ID no Resultado" — visibilidade do fenômeno já excluído do cálculo. */
    impactoFaceId: ImpactoFaceIdData;
    /** Card "Efetividade por Tipo de Argumento" — volume de retidos por técnica. */
    efetividadeArgumento: ArgumentoItem[];
    /** Config de apelidos do gestor, para resolver o nome exibido. */
    nomeFantasia: NomeFantasiaSerial;
    meta: number; // Meta de 0 a 100
    emailsEquipe: string[];
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
    const emailsEquipe = await getEmailsEquipe(user.profile.id);

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
      impactoFaceId,
      efetividadeArgumento,
      nomeFantasiaConfig,
    ] = await Promise.all([
      getVisaoGeral(emailsEquipe),
      getPorTema(emailsEquipe),
      getEvolucaoHora(emailsEquipe),
      getPorSegmento(emailsEquipe),
      getQuartilOperadores("equipe", emailsEquipe),
      getQuartilOperadores("empresa", []),
      getMatrizVolumeTaxa(emailsEquipe),
      getPorOperadorIndividual(emailsEquipe),
      getImpactoFaceId(emailsEquipe),
      getEfetividadeArgumento(emailsEquipe),
      getNomeFantasiaConfig(user.profile.id),
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
        impactoFaceId,
        efetividadeArgumento,
        nomeFantasia: {
          ativo: nomeFantasiaConfig.ativo,
          mapa: Object.fromEntries(nomeFantasiaConfig.mapa),
        },
        meta,
        emailsEquipe,
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

type OperadorDetalheResult =
  | {
      success: true;
      data: { operador: OperadorIndividual; quartil: QuartilOperador; meta: number };
    }
  | { success: false; error: string };

/**
 * Detalhamento de UM operador (retencao_atendimentos), buscado sob demanda a
 * partir da EquipeTable (d1_consolidado, topo de /reports/consolidado) —
 * fonte principal/"viva" da página. Diferente de `fetchDashboardRetencaoAction`
 * (que carrega TODOS os operadores de uma vez para o trilho analítico), esta
 * action busca só o operador clicado, mantendo a EquipeTable desacoplada do
 * carregamento pesado/lazy do bloco analítico.
 *
 * `login` é o e-mail canônico do roster (`emailOriginal` em d1_consolidado /
 * `login` em retencao_atendimentos) — mesma identidade, os dois lados
 * particionam pelo mesmo roster de `d1_operadores_gestor`.
 */
export async function fetchOperadorDetalheAction(login: string): Promise<OperadorDetalheResult> {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "GESTOR") {
    return { success: false, error: "Acesso não autorizado." };
  }

  try {
    const emailsEquipe = await getEmailsEquipe(user.profile.id);
    const prefixoAlvo = getEmailPrefix(login);

    // Confirma que o operador pedido pertence à equipe do gestor logado —
    // evita que alguém adulterando o argumento da action veja detalhamento
    // de um operador fora do seu roster.
    if (!emailsEquipe.some((email) => getEmailPrefix(email) === prefixoAlvo)) {
      return { success: false, error: "Operador fora da sua equipe." };
    }

    const [operadores, quartilEquipe, quartilPoloAll, meta] = await Promise.all([
      getPorOperadorIndividual(emailsEquipe),
      getQuartilOperadores("equipe", emailsEquipe),
      getQuartilOperadores("empresa", []),
      getMetaTxRetencao(user.profile.id),
    ]);

    const operador = operadores.find((op) => getEmailPrefix(op.login) === prefixoAlvo);
    if (!operador) {
      return { success: false, error: "Operador não encontrado." };
    }

    const quartilPorOperador = montarQuartilPorOperador(quartilEquipe, quartilPoloAll);
    const quartil = quartilDoOperador(quartilPorOperador, login);

    return { success: true, data: { operador, quartil, meta } };
  } catch (err) {
    console.error("[fetchOperadorDetalheAction] erro:", err);
    return { success: false, error: "Erro ao carregar detalhamento do operador." };
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
    const emailsEquipe = await getEmailsEquipe(user.profile.id);
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
