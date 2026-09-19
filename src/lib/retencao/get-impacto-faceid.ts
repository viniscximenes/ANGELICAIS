import { createAdminClient } from "@/lib/supabase/admin";
import { formatNomeDotSobrenome } from "@/lib/gestor/derive-nome-operador";
import { aplicarFiltroEscopo } from "./escopo";

export type OperadorFaceIdItem = {
  /** SEMPRE "nome.sobrenome" real (nunca nome fantasia) — ver comentário na função. */
  nomeSobrenome: string;
  naoRealizado: number;
  reprovado: number;
  total: number;
};

export type ImpactoFaceIdData = {
  /** Total de TENTATIVAS de FaceID abortadas (não realizado + reprovado) — conta cada linha, não contrato único. */
  total: number;
  naoRealizado: number;
  reprovado: number;
  /** Uma linha por operador da equipe com pelo menos 1 tentativa abortada, ordenado por total DESC. */
  porOperador: OperadorFaceIdItem[];
};

const STATUS_NAO_REALIZADO = "Abortado - FaceID não realizado";
const STATUS_REPROVADO = "Abortado - FaceID reprovado";

/**
 * REDEFINIÇÃO DO CARD (versão anterior tinha um stat "Excluídos da Retenção"
 * cruzado com histórico global e um "Cancelados Normalmente" — removidos).
 * Este card agora mede uma coisa mais simples e direta: TENTATIVAS de FaceID
 * que não deram certo (as duas variantes de aborto), contadas por LINHA
 * (não por contrato único/deduplicado — "tentativa" é o evento em si, não o
 * desfecho do caso).
 *
 * ESCOPO: só a equipe do gestor (`aplicarFiltroEscopo`), SEM o cruzamento
 * global usado nos outros cards (`getContratosComFaceIdGlobal`). Esse
 * cruzamento existe pra decidir se um contrato deve ser EXCLUÍDO do cálculo
 * de retidos (aí sim importa se ALGUÉM, de qualquer equipe, tocou o
 * contrato) — mas aqui a pergunta é outra: "quem da MINHA equipe tentou
 * FaceID e não conseguiu". Isso é uma propriedade da própria linha
 * (usuario_login + status_retencao), não do contrato como um todo — não há
 * nada pra cruzar com outra equipe.
 */
export async function getImpactoFaceId(emailsEquipe: string[]): Promise<ImpactoFaceIdData> {
  const supabase = createAdminClient();
  let allData: { usuario_login: string | null; status_retencao: string | null }[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("retencao_atendimentos")
      .select("usuario_login, status_retencao")
      .range(from, to);

    query = aplicarFiltroEscopo(query, { emailsEquipe });

    const { data, error } = await query;
    if (error) {
      console.error("[getImpactoFaceId] erro ao buscar dados:", error.message);
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

  const porOperadorMap = new Map<string, { naoRealizado: number; reprovado: number }>();
  let naoRealizado = 0;
  let reprovado = 0;

  for (const row of allData) {
    const status = (row.status_retencao ?? "").trim();
    const isNaoRealizado = status === STATUS_NAO_REALIZADO;
    const isReprovado = status === STATUS_REPROVADO;
    if (!isNaoRealizado && !isReprovado) continue;

    const login = row.usuario_login ?? "";
    const atual = porOperadorMap.get(login) ?? { naoRealizado: 0, reprovado: 0 };
    if (isNaoRealizado) {
      naoRealizado++;
      atual.naoRealizado++;
    } else {
      reprovado++;
      atual.reprovado++;
    }
    porOperadorMap.set(login, atual);
  }

  // nome.sobrenome real (NUNCA nome fantasia) — mesmo se duas variantes de
  // domínio do mesmo operador aparecerem, formatNomeDotSobrenome normaliza
  // pro mesmo texto, então agrupamentos por login "iguais na prática"
  // acabam exibidos como linhas separadas só se o e-mail bruto for
  // literalmente diferente (raro, mesmo padrão dos demais cards).
  const porOperador: OperadorFaceIdItem[] = [...porOperadorMap.entries()]
    .map(([login, v]) => ({
      nomeSobrenome: formatNomeDotSobrenome(login),
      naoRealizado: v.naoRealizado,
      reprovado: v.reprovado,
      total: v.naoRealizado + v.reprovado,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    total: naoRealizado + reprovado,
    naoRealizado,
    reprovado,
    porOperador,
  };
}
