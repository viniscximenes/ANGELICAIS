import { getRosterOperadoresGestor } from "@/lib/d1-db/get-roster-gestor";
import {
  aplicarRegrasDetecao,
  MAX_PAUSAS_ROWS,
  type ContagemPorDia,
  type LinhaPausaDiario,
} from "@/lib/db/detectar-registros";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEmailPrefix } from "@/lib/utils/email-variants";

const LINHA_COLUMNS =
  "data_ref, agent_user, agent_name, state, reason_code, login_time_seg, agent_state_time_seg";

/**
 * Prefixos (local-part do email, minúsculo) dos operadores da equipe do
 * gestor. agent_user em db_pausas_diario já é o local-part minúsculo
 * (parse-csv-pausas.ts) — filtrar por prefixo cobre @alloha.com e
 * @sumicity.net.br (e qualquer outro domínio) sem precisar enumerar
 * variantes, e evita o problema de agent_email manter a caixa original do
 * CSV (só agent_user é normalizado no parse).
 */
export async function getRosterPrefixos(gestorId: string): Promise<string[]> {
  const roster = await getRosterOperadoresGestor(gestorId);
  return roster.map((email) => getEmailPrefix(email));
}

/**
 * Linhas de db_pausas_diario de um dia, só dos agentes da equipe do
 * gestor (agent_user IN roster). Reusa o motor de detecção sem alterá-lo —
 * só restringe o que entra nele.
 */
export async function buscarLinhasDoDiaDaEquipe(
  dataRef: string,
  rosterPrefixos: string[],
): Promise<LinhaPausaDiario[]> {
  if (rosterPrefixos.length === 0) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("db_pausas_diario")
    .select(LINHA_COLUMNS)
    .eq("data_ref", dataRef)
    .in("agent_user", rosterPrefixos)
    .range(0, MAX_PAUSAS_ROWS - 1);

  if (error) {
    throw new Error(
      `[registros-equipe] erro ao ler db_pausas_diario do dia: ${error.message}`,
    );
  }

  return data ?? [];
}

/**
 * Contagem de registros de atenção por dia, só da equipe do gestor — usado
 * pelo seletor de dia ("(X registros detectados)"). Reimplementa o
 * agrupar-por-dia + aplicarRegrasDetecao aqui (em vez de usar
 * contarRegistrosPorDia, que é global) pra não alterar detectar-registros.ts.
 */
export async function contarRegistrosPorDiaDaEquipe(
  rosterPrefixos: string[],
): Promise<ContagemPorDia[]> {
  if (rosterPrefixos.length === 0) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("db_pausas_diario")
    .select(LINHA_COLUMNS)
    .in("agent_user", rosterPrefixos)
    .range(0, MAX_PAUSAS_ROWS - 1);

  if (error) {
    throw new Error(
      `[registros-equipe] erro ao ler db_pausas_diario da equipe: ${error.message}`,
    );
  }

  const porDia = new Map<string, LinhaPausaDiario[]>();
  for (const row of data ?? []) {
    const grupo = porDia.get(row.data_ref);
    if (grupo) {
      grupo.push(row);
    } else {
      porDia.set(row.data_ref, [row]);
    }
  }

  const resultado: ContagemPorDia[] = [];
  for (const [dataRef, linhas] of porDia) {
    resultado.push({
      dataRef,
      totalRegistros: aplicarRegrasDetecao(dataRef, linhas).length,
    });
  }

  return resultado.sort((a, b) => (a.dataRef < b.dataRef ? 1 : -1));
}
