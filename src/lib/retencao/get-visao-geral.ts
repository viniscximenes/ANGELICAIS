import { createAdminClient } from "@/lib/supabase/admin";
import { dedupePorContrato } from "./dedupe-por-contrato";
import { classificarAtendimento } from "./classificar-atendimento";
import { aplicarFiltroEscopo } from "./escopo";

export type VisaoGeralData = {
  /** PEDIDOS = RETIDOS + CANCELADOS. "Abortado" (validação FaceID sem resposta) fica fora daqui. */
  total: number;
  retidos: number;
  cancelados: number;
  tx: number | null; // null se total for 0
};

/**
 * Consulta a tabela retencao_atendimentos aplicando os filtros e retorna as métricas consolidadas.
 */
export async function getVisaoGeral(
  emailsEquipe: string[],
): Promise<VisaoGeralData> {
  const supabase = createAdminClient();
  let allData: {
    usuario_login: string | null;
    cod_air: string | null;
    status_hora: string | null;
    foi_cancelamento: boolean | null;
    status_retencao: string | null;
  }[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("retencao_atendimentos")
      .select("usuario_login, cod_air, status_hora, foi_cancelamento, status_retencao")
      .range(from, to);

    query = aplicarFiltroEscopo(query, { emailsEquipe });

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

  const linhasFinais = dedupePorContrato(allData);

  let retidos = 0;
  let cancelados = 0;
  for (const r of linhasFinais) {
    const classe = classificarAtendimento(r);
    if (classe === "cancelado") cancelados++;
    else if (classe === "retido") retidos++;
    // "abortado" fica fora de retidos, cancelados e do total de PEDIDOS.
  }
  const total = retidos + cancelados;
  const tx = total > 0 ? retidos / total : null;

  return { total, retidos, cancelados, tx };
}
