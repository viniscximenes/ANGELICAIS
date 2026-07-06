"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getEmailsEquipe } from "./get-emails-equipe";
import { getVisaoGeral, type VisaoGeralData } from "./get-visao-geral";
import { getEvolucaoHora, type HoraEvolucaoData } from "./get-evolucao-hora";
import { getQuedas } from "./get-quedas";
import { getPorTema, type TemaData } from "./get-por-tema";
import { getContribuicaoQueda, type ContribItem } from "./get-contribuicao-queda";
import { getPorOperador, type OperadorItem } from "./get-por-operador";
import { getPorSegmento, type SegmentoResult } from "./get-por-segmento";
import { getQuartilOperadores, type OperadorQuartilItem } from "./get-quartil-operadores";
import { getMatrizVolumeTaxa, type MatrizResult } from "./get-matriz-volume-taxa";
import { getAlertas, type AlertaItem } from "./get-alertas";
import { getMetaTxRetencao, salvarMetaTxRetencao } from "./meta";
import { getContratosFiltrados, type FiltroContratos } from "./get-contratos-filtrados";

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
    visaoGeralTotal: VisaoGeralData;
    visaoGeralManha: VisaoGeralData;
    visaoGeralTarde: VisaoGeralData;
    porTema: TemaData[];
    evolucaoHora: HoraEvolucaoData[];
    quedas: QuedaComContribuicao[];
    porSegmento: SegmentoResult;
    porOperador: OperadorItem[];
    quartilOperadores: OperadorQuartilItem[];
    quartilPolo: OperadorQuartilItem[];
    matriz: MatrizResult;
    alertas: AlertaItem[];
    meta: number; // Meta de 0 a 100
    emailsEquipe: string[];
  };
  error?: string;
};

/**
 * Server Action para buscar os dados consolidados do dashboard.
 */
export async function fetchDashboardRetencaoAction(
  escopo: "equipe" | "empresa",
  periodo: { horaInicio: number; horaFim: number } | null,
  turno: "manha" | "tarde",
): Promise<DashboardRetencaoResult> {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "GESTOR") {
    return { success: false, error: "Acesso não autorizado." };
  }

  try {
    const id = user.profile.username || user.profile.emailCorporativo;
    const emailsEquipe = await getEmailsEquipe(id);

    // Carrega a meta customizada do gestor logado
    const meta = await getMetaTxRetencao(user.profile.id);
    const metaFracao = meta / 100;

    const isSingleHour = periodo !== null && periodo.horaInicio === periodo.horaFim;
    const visaoGeralPeriod = (escopo === "equipe" && !isSingleHour)
      ? { horaInicio: 0, horaFim: 23 }
      : periodo;

    const [
      visaoGeral,
      visaoGeralTotal,
      visaoGeralManha,
      visaoGeralTarde,
      porTema,
      evolucaoHora,
      porSegmento,
      porOperador,
      quartilOperadores,
      quartilPoloAll,
      matriz,
      alertas,
    ] = await Promise.all([
      getVisaoGeral(escopo, emailsEquipe, visaoGeralPeriod),
      getVisaoGeral(escopo, emailsEquipe, { horaInicio: 0, horaFim: 23 }),
      getVisaoGeral(escopo, emailsEquipe, { horaInicio: 8, horaFim: 13 }),
      getVisaoGeral(escopo, emailsEquipe, { horaInicio: 14, horaFim: 19 }),
      getPorTema(escopo, emailsEquipe, periodo),
      getEvolucaoHora(escopo, emailsEquipe, turno, periodo),
      getPorSegmento(escopo, emailsEquipe, periodo),
      getPorOperador(escopo, emailsEquipe, { horaInicio: 0, horaFim: 23 }),
      getQuartilOperadores(escopo, emailsEquipe, { horaInicio: 0, horaFim: 23 }),
      getQuartilOperadores("empresa", [], { horaInicio: 0, horaFim: 23 }),
      getMatrizVolumeTaxa(escopo, emailsEquipe, periodo),
      getAlertas(escopo, emailsEquipe, periodo, turno, metaFracao),
    ]);

    const teamEmailsLower = emailsEquipe.map(e => e.toLowerCase().trim());
    const quartilPolo = escopo === "equipe"
      ? quartilPoloAll.filter((op) =>
          teamEmailsLower.includes(op.login.toLowerCase().trim())
        )
      : quartilPoloAll;

    const quedasRaw = getQuedas(evolucaoHora, turno === "tarde" ? visaoGeralManha.tx : null);
    const quedas = await Promise.all(
      quedasRaw.map(async (q) => {
        const contrib = await getContribuicaoQueda(
          escopo,
          emailsEquipe,
          q.horaAnterior,
          q.hora,
        );
        return {
          ...q,
          porMotivo: contrib.porMotivo,
          porOperador: contrib.porOperador,
        };
      }),
    );

    return {
      success: true,
      data: {
        visaoGeral,
        visaoGeralTotal,
        visaoGeralManha,
        visaoGeralTarde,
        porTema,
        evolucaoHora,
        quedas,
        porSegmento,
        porOperador,
        quartilOperadores,
        quartilPolo,
        matriz,
        alertas,
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
): Promise<{ success: boolean; data?: string[]; error?: string }> {
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
