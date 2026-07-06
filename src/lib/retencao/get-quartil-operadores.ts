import { getPorOperador } from "./get-por-operador";
import { computeQuartis, type OperadorParaQuartil } from "@/lib/kpi/gestor/compute-quartis";
import type { KpiDefinition } from "@/lib/kpi/types";

export type OperadorQuartilItem = {
  login: string;
  nome: string;
  total: number;
  retidos: number;
  cancelados: number;
  tx: number | null;
  quartil: 1 | 2 | 3 | 4 | null;
  rank: number | null;
};

// Volume mínimo de atendimentos para ranquear o operador no quartil
export const QUARTIL_VOLUME_MINIMO = 0;

/**
 * Retorna os operadores do escopo com seus respectivos ranks e quartis baseados na taxa de retenção.
 * 
 * Reusa a função pura computeQuartis do módulo de KPIs da plataforma.
 */
export async function getQuartilOperadores(
  escopo: "equipe" | "empresa",
  emailsEquipe: string[],
  periodo: { horaInicio: number; horaFim: number } | null,
): Promise<OperadorQuartilItem[]> {
  const operadores = await getPorOperador(escopo, emailsEquipe, periodo);

  // Filtra apenas operadores que atingiram o volume mínimo
  const qualificados = operadores.filter((op) => op.total >= QUARTIL_VOLUME_MINIMO);

  const listParaQuartil: OperadorParaQuartil[] = qualificados.map((op) => {
    const valoresMap = new Map<string, number | null>();
    valoresMap.set("tx_retencao", op.tx);
    return {
      email: op.login,
      valores: valoresMap,
    };
  });

  // Mock de definição de KPI exigido pela função computeQuartis
  const mockDefinitions = [
    {
      slug: "tx_retencao",
      direction: "higher_better",
    },
  ];

  const resultQuartis = computeQuartis(listParaQuartil, mockDefinitions as unknown as KpiDefinition[]);

  return operadores.map((op) => {
    const qual = op.total >= QUARTIL_VOLUME_MINIMO;
    let quartil: 1 | 2 | 3 | 4 | null = null;
    let rank: number | null = null;

    if (qual) {
      const qRes = resultQuartis.get(op.login)?.get("tx_retencao");
      if (qRes) {
        quartil = qRes.quartil;
        rank = qRes.rank;
      }
    }

    return {
      login: op.login,
      nome: op.nome,
      total: op.total,
      retidos: op.retidos,
      cancelados: op.cancelados,
      tx: op.tx,
      quartil,
      rank,
    };
  });
}
