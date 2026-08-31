"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRosterOperadoresGestor } from "@/lib/d1-db/get-roster-gestor";
import { formatNomeProprio } from "@/lib/gestor/derive-nome-operador";
import { getEvolucaoHora, type HoraEvolucaoData } from "@/lib/retencao/get-evolucao-hora";
import { getPorTema, type TemaData } from "@/lib/retencao/get-por-tema";
import {
  getPorOperadorIndividual,
  type OperadorIndividual,
} from "@/lib/retencao/get-por-operador-individual";
import { getMetaTxRetencao } from "@/lib/retencao/meta";
import {
  getIndicadoresGestor,
  listarGestoresComRoster,
  type IndicadoresGestor,
} from "./get-gestores-comparativo";

type ComparativoResumo = {
  /** Indicadores do gestor logado — vão no bloco fixo de topo. */
  gestorLogado: IndicadoresGestor & { meta: number };
  /** Um item por gestor (exceto o logado), já ordenado por tx desc. */
  outrosGestores: IndicadoresGestor[];
};

export type ComparativoResumoResult =
  | { success: true; data: ComparativoResumo }
  | { success: false; error: string };

/** Ordena por taxa de retenção desc; gestor sem pedidos vai para o fim. */
function ordenarPorTx(a: IndicadoresGestor, b: IndicadoresGestor): number {
  if (a.tx === null && b.tx === null) return a.nome.localeCompare(b.nome, "pt-BR");
  if (a.tx === null) return 1;
  if (b.tx === null) return -1;
  return b.tx - a.tx;
}

/**
 * Resumo do comparativo entre gestores: os 4 indicadores do gestor logado +
 * os mesmos 4 de cada outro gestor, todos calculados sobre
 * retencao_atendimentos particionada pelos rosters de d1_operadores_gestor.
 *
 * Só o resumo (linhas do accordion fechado). O detalhe de cada gestor
 * (gráfico, temas, operadores) é carregado sob demanda por
 * `fetchComparativoDetalheAction`.
 */
export async function fetchComparativoConsolidadoAction(): Promise<ComparativoResumoResult> {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "GESTOR") {
    return { success: false, error: "Acesso não autorizado." };
  }

  try {
    const gestores = await listarGestoresComRoster();
    const indicadores = await Promise.all(gestores.map(getIndicadoresGestor));

    const logadoIdx = indicadores.findIndex((g) => g.id === user.profile.id);
    const logado =
      logadoIdx >= 0
        ? indicadores[logadoIdx]
        : {
            id: user.profile.id,
            nome: formatNomeProprio(user.profile.fullName),
            tx: null,
            pedidos: 0,
            retidos: 0,
            cancelados: 0,
          };

    const meta = await getMetaTxRetencao(user.profile.id);

    const outrosGestores = indicadores
      .filter((g) => g.id !== user.profile.id)
      .sort(ordenarPorTx);

    return {
      success: true,
      data: { gestorLogado: { ...logado, meta }, outrosGestores },
    };
  } catch (err) {
    console.error("[fetchComparativoConsolidadoAction] erro:", err);
    return { success: false, error: "Erro ao carregar o comparativo entre gestores." };
  }
}

type ComparativoDetalhe = {
  evolucaoHora: HoraEvolucaoData[];
  porTema: TemaData[];
  operadores: OperadorIndividual[];
  /** Meta de tx do gestor (0-100), para a linha "Meta: X%" do gráfico. */
  meta: number;
};

export type ComparativoDetalheResult =
  | { success: true; data: ComparativoDetalhe }
  | { success: false; error: string };

/**
 * Detalhe de um gestor específico, carregado quando o accordion abre:
 * evolução por hora, retenção por tema e a tabela de operadores dele — todos
 * reaproveitando os getters de /reports/consolidado/analitico, só trocando o
 * conjunto de emails (roster do gestor pedido em vez do gestor logado).
 */
export async function fetchComparativoDetalheAction(
  gestorId: string,
): Promise<ComparativoDetalheResult> {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "GESTOR") {
    return { success: false, error: "Acesso não autorizado." };
  }

  try {
    const admin = createAdminClient();
    const { data: alvo } = await admin
      .from("profiles")
      .select("id")
      .eq("id", gestorId)
      .eq("role", "GESTOR")
      .maybeSingle();

    if (!alvo) {
      return { success: false, error: "Gestor não encontrado." };
    }

    const emails = await getRosterOperadoresGestor(gestorId);

    const [evolucaoHora, porTema, operadores, meta] = await Promise.all([
      getEvolucaoHora(emails),
      getPorTema(emails),
      getPorOperadorIndividual(emails),
      getMetaTxRetencao(gestorId),
    ]);

    return { success: true, data: { evolucaoHora, porTema, operadores, meta } };
  } catch (err) {
    console.error("[fetchComparativoDetalheAction] erro:", err);
    return { success: false, error: "Erro ao carregar o detalhe do gestor." };
  }
}
