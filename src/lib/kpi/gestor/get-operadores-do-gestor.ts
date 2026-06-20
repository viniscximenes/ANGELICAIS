import { createClient } from "@/lib/supabase/server";

/**
 * Retorna os operator_email (distintos) cujo meta_gestor no KPI casa com
 * o nome do gestor logado.
 *
 * Estratégia: as 2 primeiras palavras do fullName em UPPERCASE são usadas
 * como filtro ILIKE — robusto a casing variado e nomes truncados.
 *
 * Ex: "Ana Angelica Mattos Goncalves" → ILIKE '%ANA ANGELICA%'
 *     "Gabriel Henrique Ximenes Da Silva" → ILIKE '%GABRIEL HENRIQUE%'
 *
 * ILIKE no Postgres é case-insensitive, mas acento-sensitivo. Os nomes
 * dos gestores atualmente no banco não têm acentos nas 2 primeiras palavras
 * (confirmado pelos dados reais), então é seguro usar ILIKE direto.
 */
export async function getOperadoresDoGestor(
  fullName: string,
  mesRef: string,
): Promise<string[]> {
  const supabase = await createClient();

  const palavras = fullName.trim().toUpperCase().split(/\s+/).filter(Boolean);
  const filtro = palavras.slice(0, 2).join(" ");

  if (!filtro) return [];

  console.log("[getOperadoresDoGestor] params:", { fullName, mesRef, filtro });

  const { data, error } = await supabase
    .from("kpi_monthly_snapshots")
    .select("operator_email")
    .eq("mes_ref", mesRef)
    .eq("kpi_slug", "meta_gestor")
    .ilike("valor_texto", `%${filtro}%`);

  if (error) {
    console.error("[getOperadoresDoGestor] erro:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return [];
  }

  console.log("[getOperadoresDoGestor] rows encontrados:", data?.length ?? 0);

  return [
    ...new Set((data ?? []).map((r) => r.operator_email.trim().toLowerCase())),
  ];
}
