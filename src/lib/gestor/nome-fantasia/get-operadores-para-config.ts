import { resolveGestorId } from "@/lib/d1-db/resolve-gestor-id";
import { createAdminClient } from "@/lib/supabase/admin";

export type OperadorParaConfig = {
  email: string;
  nomeReal: string;
};

function emailToNomeReal(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local
    .split(".")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Retorna a lista de operadores da equipe do gestor (d1_operadores_gestor).
 * Usa os mesmos emails que alimentam as tabelas do painel do gestor.
 */
export async function getOperadoresParaConfig(
  username: string,
  emailCorporativo: string,
): Promise<OperadorParaConfig[]> {
  const gestorId = (await resolveGestorId(username)) ?? (await resolveGestorId(emailCorporativo));
  if (!gestorId) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("d1_operadores_gestor")
    .select("operador_email")
    .eq("gestor_id", gestorId);

  if (error) {
    console.error("[getOperadoresParaConfig] erro ao buscar operadores do gestor:", error.message);
    return [];
  }

  return (data ?? [])
    .map((row) => row.operador_email.trim().toLowerCase())
    .filter(Boolean)
    .map((email) => ({ email, nomeReal: emailToNomeReal(email) }));
}
