import { createClient } from "@/lib/supabase/server";

export type GestorProprioData = {
  hasData: boolean;
  mesRef: string;
  dataCorte: string | null;
  valuesBySlug: Map<string, number | null>;
};

/**
 * Busca os KPIs próprios do gestor em kpi_gestor_snapshots.
 *
 * Usa as 2 primeiras palavras do fullName em uppercase como filtro ILIKE —
 * mesmo padrão de getOperadoresDoGestor para consistência.
 */
export async function getKpiGestorProprio(
  fullName: string,
  mesRef: string,
): Promise<GestorProprioData> {
  const empty: GestorProprioData = {
    hasData: false,
    mesRef,
    dataCorte: null,
    valuesBySlug: new Map(),
  };

  const palavras = fullName.trim().toUpperCase().split(/\s+/).filter(Boolean);
  const filtro = palavras.slice(0, 2).join(" ");

  if (!filtro) return empty;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("kpi_gestor_snapshots")
    .select("kpi_slug, valor_numerico, data_corte")
    .eq("mes_ref", mesRef)
    .ilike("supervisor_name", `%${filtro}%`);

  if (error) {
    console.error("[getKpiGestorProprio] erro:", {
      message: error.message,
      code: error.code,
    });
    return empty;
  }

  if (!data || data.length === 0) return empty;

  const dataCorte =
    [...data]
      .map((r) => r.data_corte as string | null)
      .filter((v): v is string => Boolean(v))
      .sort()
      .reverse()[0] ?? null;

  const valuesBySlug = new Map<string, number | null>();
  for (const row of data) {
    if (row.valor_numerico !== null) {
      valuesBySlug.set(row.kpi_slug as string, Number(row.valor_numerico));
    }
  }

  return { hasData: true, mesRef, dataCorte, valuesBySlug };
}
