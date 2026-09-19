import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Retorna os e-mails dos operadores da equipe do gestor (d1_operadores_gestor).
 *
 * Recebe o `gestorId` (profiles.id) diretamente — resolvido pelo chamador a
 * partir de `user.profile.id` (sessão já autenticada). Não re-resolve por
 * username/e-mail (ver `resolveGestorId`, deixado de ser usado aqui na fusão
 * de /reports/consolidado com /reports/consolidado/analitico).
 */
export async function getEmailsEquipe(gestorId: string): Promise<string[]> {
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
