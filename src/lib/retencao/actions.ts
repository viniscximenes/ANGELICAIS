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

type DashboardRetencaoResult = {
  success: boolean;
  data?: {
    visaoGeral: VisaoGeralData;
    porTema: TemaData[];
    evolucaoHora: HoraEvolucaoData[];
    porSegmento: SegmentoResult;
    quartilOperadores: OperadorQuartilItem[];
    quartilPolo: OperadorQuartilItem[];
    /** Card "Impacto do Face ID no Resultado" — visibilidade do fenômeno já excluído do cálculo. */
    impactoFaceId: ImpactoFaceIdData;
    /** Card "Efetividade por Tipo de Argumento" — volume de retidos por técnica. */
    efetividadeArgumento: ArgumentoItem[];
    /** Roster da equipe — lista de operadores do "Copiar contratos do AIR". */
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

    // Só o que a tela usa. A meta vem do servidor da página (mesma da
    // EquipeTable) e o nome fantasia não é exibido no Analítico.
    const [
      visaoGeral,
      porTema,
      evolucaoHora,
      porSegmento,
      quartilOperadores,
      quartilPoloAll,
      impactoFaceId,
      efetividadeArgumento,
    ] = await Promise.all([
      getVisaoGeral(emailsEquipe),
      getPorTema(emailsEquipe),
      getEvolucaoHora(emailsEquipe, { porOperador: true }),
      getPorSegmento(emailsEquipe),
      getQuartilOperadores("equipe", emailsEquipe),
      getQuartilOperadores("empresa", []),
      getImpactoFaceId(emailsEquipe),
      getEfetividadeArgumento(emailsEquipe),
    ]);

    // Operadores da equipe, mas com o rank/quartil calculado sobre o polo.
    // Por PREFIXO (sem domínio): getPorOperador agrupa por prefixo e guarda
    // como `login` a primeira variante que encontrou — se fosse a
    // @sumicity.net.br, a comparação exata com o roster (@alloha.com) tirava
    // o operador do comparativo de quartil.
    const prefixosEquipe = new Set(emailsEquipe.map(getEmailPrefix));

    const quartilPolo = quartilPoloAll.filter((op: OperadorQuartilItem) =>
      prefixosEquipe.has(getEmailPrefix(op.login)),
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
        impactoFaceId,
        efetividadeArgumento,
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
 * partir da EquipeTable (d1_consolidado, topo de /s/reports/consolidado) —
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
  // Server Action é um endpoint público: o tipo do TS não chega em runtime.
  if (typeof login !== "string" || login.trim() === "") {
    return { success: false, error: "Operador inválido." };
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

  // Server Action é um endpoint público: os tipos do TS não chegam em
  // runtime. Monta o filtro só com campos conferidos (o escopo da equipe já
  // é garantido por emailsEquipe; isto evita valores malformados).
  const textoOuNull = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v : null);
  const hora = (v: unknown) => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 23;
  if (!filtros || typeof filtros !== "object" || !["retido", "cancelado", "todos"].includes(filtros.status)) {
    return { success: false, error: "Filtros inválidos." };
  }
  const periodo =
    filtros.periodo && hora(filtros.periodo.horaInicio) && hora(filtros.periodo.horaFim)
      ? { horaInicio: filtros.periodo.horaInicio, horaFim: filtros.periodo.horaFim }
      : null;

  try {
    const emailsEquipe = await getEmailsEquipe(user.profile.id);
    const data = await getContratosFiltrados({
      operador: textoOuNull(filtros.operador),
      status: filtros.status,
      periodo,
      motivo: textoOuNull(filtros.motivo),
      submotivo: textoOuNull(filtros.submotivo),
      emailsEquipe,
    });
    return { success: true, data };
  } catch (err) {
    console.error("[fetchContratosFiltradosAction] erro ao buscar contratos:", err);
    return { success: false, error: "Erro ao consultar contratos." };
  }
}
