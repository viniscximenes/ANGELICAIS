import { createAdminClient } from "@/lib/supabase/admin";
import { classificarAtendimento } from "./classificar-atendimento";
import { getEmailPrefix } from "@/lib/utils/email-variants";
import { aplicarFiltroEscopo } from "./escopo";

type OperadorItem = {
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
): Promise<OperadorItem[]> {
  const supabase = createAdminClient();
  let allData: {
    usuario_login: string | null;
    usuario_nome: string | null;
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
      .select("usuario_login, usuario_nome, foi_cancelamento, status_retencao")
      .range(from, to);

    query = aplicarFiltroEscopo(query, { escopo, emailsEquipe });

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

  const operators: Record<
    string,
    { login: string; nome: string; total: number; retidos: number; cancelados: number }
  > = {};

  for (const item of list) {
    const login = (item.usuario_login || "desconhecido").trim().toLowerCase();
    // Agrupa por PREFIXO (sem domínio) — operadores antigos aparecem com
    // @alloha.com e @sumicity.net.br na mesma base; sem isso, a mesma pessoa
    // vira duas linhas separadas na tabela.
    const chave = getEmailPrefix(login);

    // Normaliza o nome: prioriza usuario_nome, senão pega a parte antes do @ no login
    let nome = item.usuario_nome ? item.usuario_nome.trim() : "";
    if (!nome) {
      nome = item.usuario_login ? item.usuario_login.split("@")[0].trim() : "Operador Desconhecido";
    }

    const classe = classificarAtendimento(item);

    if (!operators[chave]) {
      // login: guarda a primeira variante encontrada — usada depois como
      // filtro (getContratosFiltrados já expande pras duas variantes).
      operators[chave] = { login, nome, total: 0, retidos: 0, cancelados: 0 };
    }

    // "Abortado" (validação FaceID sem resposta) fica fora de total (=
    // PEDIDOS), retidos e cancelados — não é nem sucesso nem fracasso de
    // retenção, e PEDIDOS = RETIDOS + CANCELADOS.
    if (classe === "cancelado") {
      operators[chave].total += 1;
      operators[chave].cancelados += 1;
    } else if (classe === "retido") {
      operators[chave].total += 1;
      operators[chave].retidos += 1;
    }
  }

  const result = Object.values(operators).map((vals) => {
    const denom = vals.retidos + vals.cancelados;
    const tx = denom > 0 ? vals.retidos / denom : null;
    return {
      login: vals.login,
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
