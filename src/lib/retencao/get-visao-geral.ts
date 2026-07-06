import { createAdminClient } from "@/lib/supabase/admin";
import { aplicarFiltroEscopo } from "./escopo";

export type VisaoGeralData = {
  total: number;
  retidos: number;
  cancelados: number;
  tx: number | null; // null se total for 0
};

/**
 * Consulta a tabela retencao_atendimentos aplicando os filtros e retorna as métricas consolidadas.
 */
export async function getVisaoGeral(
  escopo: "equipe" | "empresa",
  emailsEquipe: string[],
  periodo: { horaInicio: number; horaFim: number } | null,
): Promise<VisaoGeralData> {
  const supabase = createAdminClient();
  let allData: { foi_cancelamento: boolean | null }[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("retencao_atendimentos")
      .select("foi_cancelamento")
      .range(from, to);

    query = aplicarFiltroEscopo(query, { escopo, emailsEquipe, periodo });

    const { data, error } = await query;
    if (error) {
      console.error("[getVisaoGeral] erro ao consultar visão geral no Supabase:", error.message);
      throw new Error(error.message);
    }

    const list = data || [];
    allData = allData.concat(list);

    if (list.length < pageSize) {
      hasMore = false;
    } else {
      page++;
    }
  }

  const total = allData.length;
  const cancelados = allData.filter((r) => r.foi_cancelamento === true).length;
  const retidos = total - cancelados;
  const tx = total > 0 ? retidos / total : null;

  return { total, retidos, cancelados, tx };
}
