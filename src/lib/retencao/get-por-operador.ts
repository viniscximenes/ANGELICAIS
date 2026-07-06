import { createAdminClient } from "@/lib/supabase/admin";
import { aplicarFiltroEscopo } from "./escopo";

export type OperadorItem = {
  login: string;
  nome: string;
  total: number;
  retidos: number;
  cancelados: number;
  tx: number | null;
};

/**
 * Consulta e agrupa atendimentos por operador (usuario_login).
 * 
 * Ordenação padrão: por volume total decrescente (total DESC).
 */
export async function getPorOperador(
  escopo: "equipe" | "empresa",
  emailsEquipe: string[],
  periodo: { horaInicio: number; horaFim: number } | null,
): Promise<OperadorItem[]> {
  const supabase = createAdminClient();
  let allData: { usuario_login: string | null; usuario_nome: string | null; foi_cancelamento: boolean | null }[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("retencao_atendimentos")
      .select("usuario_login, usuario_nome, foi_cancelamento")
      .range(from, to);

    query = aplicarFiltroEscopo(query, { escopo, emailsEquipe, periodo });

    const { data, error } = await query;
    if (error) {
      console.error("[getPorOperador] erro ao buscar dados por operador:", error.message);
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

  const list = allData;

  const operators: Record<string, { nome: string; total: number; retidos: number; cancelados: number }> = {};

  for (const item of list) {
    const login = (item.usuario_login || "desconhecido").trim().toLowerCase();
    
    // Normaliza o nome: prioriza usuario_nome, senão pega a parte antes do @ no login
    let nome = item.usuario_nome ? item.usuario_nome.trim() : "";
    if (!nome) {
      nome = item.usuario_login ? item.usuario_login.split("@")[0].trim() : "Operador Desconhecido";
    }

    const isCancel = item.foi_cancelamento === true;

    if (!operators[login]) {
      operators[login] = { nome, total: 0, retidos: 0, cancelados: 0 };
    }

    operators[login].total += 1;
    if (isCancel) {
      operators[login].cancelados += 1;
    } else {
      operators[login].retidos += 1;
    }
  }

  const result = Object.entries(operators).map(([login, vals]) => {
    const denom = vals.retidos + vals.cancelados;
    const tx = denom > 0 ? vals.retidos / denom : null;
    return {
      login,
      nome: vals.nome,
      total: vals.total,
      retidos: vals.retidos,
      cancelados: vals.cancelados,
      tx,
    };
  });

  // Ordenação default: Volume de atendimentos decrescente (Total DESC)
  return result.sort((a, b) => b.total - a.total);
}
