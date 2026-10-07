import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Retorna os e-mails dos operadores da equipe do gestor (d1_operadores_gestor).
 *
 * Recebe o `gestorId` (profiles.id) diretamente — resolvido pelo chamador a
 * partir de `user.profile.id` (sessão já autenticada). Não re-resolve por
 * username/e-mail (ver `resolveGestorId`, deixado de ser usado aqui na fusão
 * de /s/reports/consolidado com /s/reports/consolidado/analitico).
 *
 * Erro de banco LANÇA (não devolve []): lista vazia é "equipe sem ninguém" e
 * faria o Analítico responder sucesso com tudo zerado ("Aguardando dados")
 * quando na verdade a consulta falhou. Os chamadores (actions.ts) já tratam
 * a exceção como erro.
 */
export async function getEmailsEquipe(gestorId: string): Promise<string[]> {
  if (!gestorId) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("d1_operadores_gestor")
    .select("operador_email")
    .eq("gestor_id", gestorId);

  if (error) {
    console.error("[getEmailsEquipe] erro ao buscar operadores do gestor:", error.message);
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => row.operador_email.trim().toLowerCase());
}
