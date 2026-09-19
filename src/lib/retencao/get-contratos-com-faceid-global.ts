import { createAdminClient } from "@/lib/supabase/admin";
import { contratosTocadosPorFaceId } from "./dedupe-por-contrato";

/**
 * Busca o Set de contratos (cod_air) com histórico de FaceID varrendo
 * `retencao_atendimentos` INTEIRA, SEM o filtro de escopo/equipe
 * (`aplicarFiltroEscopo`) que os `get-*.ts` normalmente aplicam.
 *
 * CAUSA RAIZ da discrepância de 1 retido entre a EquipeTable (d1_consolidado)
 * e o Analítico (retencao_atendimentos), confirmada com dados reais: o
 * contrato 4736978 foi tocado por FaceID pela operadora vanessa.duarte
 * (Abortado - FaceID às 18:18) e, 13min depois, "retido" pelo operador
 * helton.teixeira — só que vanessa.duarte é de OUTRA equipe (outro gestor).
 * `upload-consolidado-action.ts` processa o CSV inteiro de uma vez (todos os
 * gestores juntos), então enxerga o toque de FaceID da vanessa e exclui o
 * contrato certinho pro helton (d1_consolidado = 7 retidos). Mas os
 * `get-*.ts` do Analítico buscavam `retencao_atendimentos` já FILTRADA por
 * `emailsEquipe` (só o time do helton) ANTES de montar o Set de FaceID —
 * como vanessa nunca aparece nessa consulta filtrada, o Set não via o toque
 * dela, e o contrato ficava contando como retido válido pro helton (8).
 *
 * A regra de histórico de FaceID é por NATUREZA cross-equipe (mesmo
 * cod_air pode ter sido tocado por um agente de outro time) — por isso essa
 * consulta específica nunca deve levar filtro de escopo, mesmo que a
 * consulta principal da função que a chama seja escopada pra equipe do
 * gestor. Consulta enxuta (só as 3 colunas necessárias) pra manter o custo
 * baixo mesmo sendo full-table.
 */
export async function getContratosComFaceIdGlobal(): Promise<Set<string>> {
  const supabase = createAdminClient();
  let allData: {
    cod_air: string | null;
    status_retencao: string | null;
    primeiro_nivel: string | null;
  }[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from("retencao_atendimentos")
      .select("cod_air, status_retencao, primeiro_nivel")
      .range(from, to);

    if (error) {
      console.error("[getContratosComFaceIdGlobal] erro ao buscar histórico de FaceID:", error.message);
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

  return contratosTocadosPorFaceId(allData);
}
