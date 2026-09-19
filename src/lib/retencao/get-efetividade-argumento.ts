import { createAdminClient } from "@/lib/supabase/admin";
import { dedupePorContrato, classificarComHistoricoFaceId } from "./dedupe-por-contrato";
import { getContratosComFaceIdGlobal } from "./get-contratos-com-faceid-global";
import { aplicarFiltroEscopo } from "./escopo";

export type ArgumentoItem = {
  categoria: string;
  quantidade: number;
  /** Fração 0-1 do total de retidos — não é "tx de retenção" (ver comentário do arquivo). */
  percentualDoTotal: number;
};

const SEM_CATEGORIA = "Sem categoria";

type LinhaCrua = {
  usuario_login: string | null;
  cod_air: string | null;
  status_hora: string | null;
  foi_cancelamento: boolean | null;
  status_retencao: string | null;
  primeiro_nivel: string | null;
};

/**
 * Volume de contratos RETIDOS por técnica de negociação (`primeiro_nivel`).
 *
 * NÃO é uma "tx de retenção por técnica" — investigado nos dados reais:
 * `primeiro_nivel` é SEMPRE null em toda linha de cancelamento (foi_
 * cancelamento = true), 100% dos casos, sem exceção. Só aparece preenchido
 * quando há negociação registrada num desfecho de retenção. Sem cancelados
 * "daquela técnica" pra formar o denominador, uma "tx por técnica" seria
 * calculada sobre um total que não existe de forma consistente — mostrar
 * isso seria uma métrica formalmente calculável mas SEMANTICAMENTE falsa
 * (pareceria 100% em toda categoria, já que não há "fracasso" atribuível a
 * nenhuma). Por isso o card mostra só o VOLUME retido por técnica.
 *
 * Contratos excluídos pela regra de FaceID (`primeiro_nivel = "FaceID"`
 * pontual ou histórico, ver classificarComHistoricoFaceId) não entram aqui:
 * FaceID não é uma técnica de negociação real, é o próprio problema que os
 * outros cards já isolam.
 */
export async function getEfetividadeArgumento(emailsEquipe: string[]): Promise<ArgumentoItem[]> {
  const supabase = createAdminClient();
  let allData: LinhaCrua[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("retencao_atendimentos")
      .select("usuario_login, cod_air, status_hora, foi_cancelamento, status_retencao, primeiro_nivel")
      .range(from, to);

    query = aplicarFiltroEscopo(query, { emailsEquipe });

    const { data, error } = await query;
    if (error) {
      console.error("[getEfetividadeArgumento] erro ao buscar dados:", error.message);
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

  const contratosComFaceId = await getContratosComFaceIdGlobal();
  const linhasFinais = dedupePorContrato(allData);

  const porCategoria = new Map<string, number>();
  let totalRetidos = 0;

  for (const row of linhasFinais) {
    const classe = classificarComHistoricoFaceId(row, contratosComFaceId);
    if (classe !== "retido") continue;

    totalRetidos++;
    const categoria = row.primeiro_nivel?.trim() || SEM_CATEGORIA;
    porCategoria.set(categoria, (porCategoria.get(categoria) ?? 0) + 1);
  }

  const result: ArgumentoItem[] = [...porCategoria.entries()].map(([categoria, quantidade]) => ({
    categoria,
    quantidade,
    percentualDoTotal: totalRetidos > 0 ? quantidade / totalRetidos : 0,
  }));

  return result.sort((a, b) => b.quantidade - a.quantidade);
}
