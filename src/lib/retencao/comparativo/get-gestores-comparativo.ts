import { createAdminClient } from "@/lib/supabase/admin";
import { getRosterOperadoresGestor } from "@/lib/d1-db/get-roster-gestor";
import { formatNomeProprio } from "@/lib/gestor/derive-nome-operador";
import { getVisaoGeral, type VisaoGeralData } from "@/lib/retencao/get-visao-geral";

/**
 * Um gestor + o roster de operadores que ele configura em
 * /configuracoes/equipe (d1_operadores_gestor). Cada gestor é dono de um
 * conjunto fixo e disjunto de operadores — não há operador compartilhado —,
 * então agrupar retencao_atendimentos por esses rosters é uma partição
 * direta da base.
 */
export type GestorComRoster = {
  id: string;
  /** profiles.full_name já formatado (Title Case). */
  nome: string;
  /** profiles.username ("nome.sobrenome") — usado pelo comparativo pra exibir "Nome Sobrenome". */
  username: string | null;
  /** Emails do roster (d1_operadores_gestor.operador_email), lower-case. */
  emails: string[];
};

/** Os 4 indicadores de topo, idênticos aos de /s/reports/consolidado/analitico. */
export type IndicadoresGestor = {
  /** profiles.id */
  id: string;
  nome: string;
  /** profiles.username ("nome.sobrenome"), ver GestorComRoster. */
  username: string | null;
  /** Taxa de retenção 0-1 (null quando não há pedidos). */
  tx: number | null;
  /** PEDIDOS = RETIDOS + CANCELADOS. */
  pedidos: number;
  retidos: number;
  cancelados: number;
};

/**
 * Lista todos os gestores ativos (profiles.role = 'GESTOR') já com o roster
 * de operadores de cada um. Um gestor sem nenhum operador cadastrado entra
 * na lista com `emails: []` (aparece no comparativo com os números zerados).
 */
export async function listarGestoresComRoster(): Promise<GestorComRoster[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("profiles")
    .select("id, full_name, username")
    .eq("role", "GESTOR")
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (error) {
    console.error("[listarGestoresComRoster] erro ao buscar gestores:", error.message);
    return [];
  }

  const gestores = data ?? [];

  return Promise.all(
    gestores.map(async (g) => ({
      id: g.id as string,
      nome: g.full_name ? formatNomeProprio(g.full_name) : (g.username ?? "Gestor"),
      username: (g.username as string | null) ?? null,
      emails: await getRosterOperadoresGestor(g.id as string),
    })),
  );
}

/**
 * Calcula os 4 indicadores de um gestor a partir de retencao_atendimentos,
 * filtrando pelos operadores dele. Reaproveita `getVisaoGeral` (mesma query,
 * mesma classificação e mesma normalização usuario_login ↔ email de
 * /s/reports/consolidado/analitico).
 */
export async function getIndicadoresGestor(
  gestor: GestorComRoster,
): Promise<IndicadoresGestor> {
  const visao: VisaoGeralData = await getVisaoGeral(gestor.emails);
  return {
    id: gestor.id,
    nome: gestor.nome,
    username: gestor.username,
    tx: visao.tx,
    pedidos: visao.total,
    retidos: visao.retidos,
    cancelados: visao.cancelados,
  };
}
