import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Emails dos operadores cadastrados na equipe de um gestor
 * (d1_operadores_gestor) — a lista da EQUIPE em si, independente de já ter
 * dado do dia em d1_consolidado/d1_tempo_logado/d1_indisponibilidade.
 * "Equipe vazia" (retorno []) e "equipe sem dado do dia" são estados
 * diferentes; só o primeiro deve virar o erro "sem equipe" nas páginas do
 * gestor.
 */
export async function getRosterOperadoresGestor(gestorId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("d1_operadores_gestor")
    .select("operador_email")
    .eq("gestor_id", gestorId)
    .order("operador_email", { ascending: true });

  if (error) {
    console.error("[get-roster-gestor] erro ao buscar operadores do gestor:", error.message);
    return [];
  }

  return (data ?? []).map((row) => row.operador_email.trim().toLowerCase());
}
