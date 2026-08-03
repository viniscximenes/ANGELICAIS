import { resolveGestorId } from "@/lib/d1-db/resolve-gestor-id";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Retorna os e-mails dos operadores da equipe do gestor (d1_operadores_gestor).
 *
 * @param identificador O username ("nome.sobrenome") ou e-mail corporativo do gestor logado.
 */
export async function getEmailsEquipe(identificador: string): Promise<string[]> {
  const gestorId = await resolveGestorId(identificador);
  if (!gestorId) return [];

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("d1_operadores_gestor")
      .select("operador_email")
      .eq("gestor_id", gestorId);

    if (error) {
      console.error("[getEmailsEquipe] erro ao buscar operadores do gestor:", error.message);
      return [];
    }

    return (data ?? []).map((row) => row.operador_email.trim().toLowerCase());
  } catch (err) {
    console.error("[getEmailsEquipe] erro ao obter e-mails da equipe do gestor:", err);
    return [];
  }
}
