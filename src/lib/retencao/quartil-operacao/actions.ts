"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRosterOperadoresGestor } from "@/lib/d1-db/get-roster-gestor";
import { formatNomeProprio } from "@/lib/gestor/derive-nome-operador";
import { getEmailPrefix } from "@/lib/utils/email-variants";
import {
  getPorOperadorIndividual,
  type OperadorIndividual,
} from "@/lib/retencao/get-por-operador-individual";
import {
  montarQuartilPorOperador,
  quartilDoOperador,
  type QuartilOperador,
} from "@/lib/retencao/get-quartil-operador";
import { getQuartilOperadores } from "@/lib/retencao/get-quartil-operadores";
import { getMetaTxRetencao } from "@/lib/retencao/meta";
import {
  getIndicadoresGestor,
  listarGestoresComRoster,
  type IndicadoresGestor,
} from "@/lib/retencao/comparativo/get-gestores-comparativo";
import { getMapaOperadorGestor } from "@/lib/retencao/get-mapa-operador-gestor";

/**
 * Resumo por supervisor mostrado na linha fechada da lista — os mesmos 4
 * indicadores do comparativo (IndicadoresGestor) + a contagem de Q4.
 */
export type SupervisorQuartilResumo = IndicadoresGestor & {
  /** Quantos operadores do roster dele estão em Q4 do ranking da EMPRESA. */
  qtdOperadoresQ4: number;
};

type QuartilOperacaoResumo = {
  /** Indicadores do gestor logado — bloco fixo de topo (igual ao comparativo). */
  gestorLogado: IndicadoresGestor & { meta: number };
  /** Um item por supervisor, ordenado por qtd de operadores em Q4 (desc). */
  supervisores: SupervisorQuartilResumo[];
};

export type QuartilOperacaoResumoResult =
  | { success: true; data: QuartilOperacaoResumo }
  | { success: false; error: string };

/**
 * Ranking de quartil da empresa inteira, restrito aos operadores cadastrados
 * em d1_operadores_gestor (união de todos os rosters). Sem a allowlist,
 * logins que não são operadores de ninguém (ADM testando, gestor cancelando
 * 1 atendimento na mão, login de outra área) entram com volume ínfimo e tx
 * ~0% e empurram operadores reais para quartis piores.
 *
 * Usado nos dois níveis (resumo e detalhe), então a contagem de Q4 da linha
 * sempre bate com a lista aberta.
 */
async function getRankingEmpresa(mapaOperadorGestor: Map<string, string>) {
  return getQuartilOperadores("empresa", [], {
    loginsPermitidos: mapaOperadorGestor.keys(),
  });
}

/** Mais operadores em Q4 primeiro; empate segue a ordem do comparativo. */
function ordenarPorQ4(a: SupervisorQuartilResumo, b: SupervisorQuartilResumo): number {
  // Supervisores com mais operadores em Q4 primeiro (precisam de suporte).
  if (b.qtdOperadoresQ4 !== a.qtdOperadoresQ4) {
    return b.qtdOperadoresQ4 - a.qtdOperadoresQ4;
  }
  // Empate: mesma regra do comparativo — tx desc, sem pedidos no fim.
  if (a.tx === null && b.tx === null) return a.nome.localeCompare(b.nome, "pt-BR");
  if (a.tx === null) return 1;
  if (b.tx === null) return -1;
  if (b.tx !== a.tx) return b.tx - a.tx;
  return a.nome.localeCompare(b.nome, "pt-BR");
}

/**
 * Nível 1 — indicadores do gestor logado (topo) + lista de supervisores com
 * os 4 indicadores da equipe e a contagem de operadores em Q4 da empresa.
 *
 * Indicadores: mesma fonte do comparativo (getIndicadoresGestor →
 * getVisaoGeral sobre o roster). Q4: o ranking é calculado UMA vez sobre a
 * empresa inteira e cada operador Q4 é atribuído ao supervisor dono dele via
 * o roster global (`getMapaOperadorGestor`).
 *
 * O detalhe de cada supervisor é carregado sob demanda por
 * `fetchQuartilOperacaoDetalheAction`.
 */
export async function fetchQuartilOperacaoAction(): Promise<QuartilOperacaoResumoResult> {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "GESTOR") {
    return { success: false, error: "Acesso não autorizado." };
  }

  try {
    const [gestores, mapaOperadorGestor, meta] = await Promise.all([
      listarGestoresComRoster(),
      getMapaOperadorGestor(),
      getMetaTxRetencao(user.profile.id),
    ]);

    const [rankingEmpresa, indicadores] = await Promise.all([
      getRankingEmpresa(mapaOperadorGestor),
      Promise.all(gestores.map(getIndicadoresGestor)),
    ]);

    // Conta operadores em Q4 por gestor dono do operador (roster global).
    const q4PorGestor = new Map<string, number>();
    for (const op of rankingEmpresa) {
      if (op.quartil !== 4) continue;
      const gestorId = mapaOperadorGestor.get(getEmailPrefix(op.login));
      if (!gestorId) continue;
      q4PorGestor.set(gestorId, (q4PorGestor.get(gestorId) ?? 0) + 1);
    }

    const supervisores: SupervisorQuartilResumo[] = indicadores
      .map((ind) => ({ ...ind, qtdOperadoresQ4: q4PorGestor.get(ind.id) ?? 0 }))
      .sort(ordenarPorQ4);

    // Mesmo fallback do comparativo quando o logado não tem roster.
    const logado =
      indicadores.find((g) => g.id === user.profile.id) ?? {
        id: user.profile.id,
        nome: formatNomeProprio(user.profile.fullName),
        username: user.profile.username ?? null,
        tx: null,
        pedidos: 0,
        retidos: 0,
        cancelados: 0,
      };

    return {
      success: true,
      data: { gestorLogado: { ...logado, meta }, supervisores },
    };
  } catch (err) {
    console.error("[fetchQuartilOperacaoAction] erro:", err);
    return { success: false, error: "Erro ao carregar o quartil da operação." };
  }
}

type QuartilOperacaoDetalhe = {
  /** Meta de tx (0-100) do supervisor consultado. */
  meta: number;
  /**
   * Operadores em Q4 da empresa que são do supervisor — mesmo formato da
   * tabela de operadores do comparativo (getPorOperadorIndividual), já com
   * evolução por hora e quebra por tema para o card individual.
   */
  operadores: OperadorIndividual[];
  /** Quartil de cada operador (equipe e empresa), indexado por prefixo. */
  quartilPorOperador: Record<string, QuartilOperador>;
};

export type QuartilOperacaoDetalheResult =
  | { success: true; data: QuartilOperacaoDetalhe }
  | { success: false; error: string };

/**
 * Nível 2 — detalhe de um supervisor, carregado quando a linha expande.
 *
 * Mesmas regras do detalhe do comparativo: os números de cada operador vêm de
 * `getPorOperadorIndividual(roster)` (uma varredura só, com a quebra por
 * tema e por hora já agregadas). O recorte de Q4 usa o mesmo ranking e o
 * mesmo mapa operador → supervisor do nível 1.
 */
export async function fetchQuartilOperacaoDetalheAction(
  gestorId: string,
): Promise<QuartilOperacaoDetalheResult> {
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
      return { success: false, error: "Supervisor não encontrado." };
    }

    const [roster, meta, mapaOperadorGestor] = await Promise.all([
      getRosterOperadoresGestor(gestorId),
      getMetaTxRetencao(gestorId),
      getMapaOperadorGestor(),
    ]);

    const [rankingEmpresa, rankingEquipe, individuais] = await Promise.all([
      getRankingEmpresa(mapaOperadorGestor),
      getQuartilOperadores("equipe", roster),
      getPorOperadorIndividual(roster),
    ]);

    // Mesmo critério de atribuição do nível 1 (mapa global), pra a lista
    // aberta sempre bater com a contagem da linha.
    const prefixosQ4 = new Set(
      rankingEmpresa
        .filter(
          (op) =>
            op.quartil === 4 &&
            mapaOperadorGestor.get(getEmailPrefix(op.login)) === gestorId,
        )
        .map((op) => getEmailPrefix(op.login)),
    );

    const operadores = individuais.filter((op) =>
      prefixosQ4.has(getEmailPrefix(op.login)),
    );

    const quartilTodos = montarQuartilPorOperador(rankingEquipe, rankingEmpresa);
    const quartilPorOperador: Record<string, QuartilOperador> = {};
    for (const op of operadores) {
      quartilPorOperador[getEmailPrefix(op.login)] = quartilDoOperador(quartilTodos, op.login);
    }

    return { success: true, data: { meta, operadores, quartilPorOperador } };
  } catch (err) {
    console.error("[fetchQuartilOperacaoDetalheAction] erro:", err);
    return { success: false, error: "Erro ao carregar o detalhe do supervisor." };
  }
}
