import { createClient } from "@/lib/supabase/server";

/**
 * mes_ref distintos em kpi_gestor_snapshots pro gestor logado (mesmo
 * matching ILIKE de getKpiGestorProprio), desc. Diferente do equivalente em
 * kpi_monthly_snapshots (nível operador — precisa de RPC pra não estourar o
 * teto de ~1000 linhas do PostgREST), aqui o filtro por supervisor_name já
 * restringe a UM gestor — poucas centenas de linhas mesmo com muitos meses
 * de histórico, então o select direto + dedupe em JS é seguro.
 */
export async function getMesesDisponiveisGestor(fullName: string): Promise<string[]> {
  const palavras = fullName.trim().toUpperCase().split(/\s+/).filter(Boolean);
  const filtro = palavras.slice(0, 2).join(" ");
  if (!filtro) return [];

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("kpi_gestor_snapshots")
    .select("mes_ref")
    .ilike("supervisor_name", `%${filtro}%`);

  if (error) {
    console.error("[getMesesDisponiveisGestor] erro:", error.message);
    return [];
  }

  const meses = [...new Set((data ?? []).map((r) => r.mes_ref as string))];
  meses.sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
  return meses;
}
