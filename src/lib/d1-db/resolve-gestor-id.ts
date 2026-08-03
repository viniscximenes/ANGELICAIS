import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Resolve o profiles.id de um GESTOR a partir do username OU do email
 * corporativo (qualquer um dos dois) — mesma convenção de identificador do
 * antigo resolveGuiaGestor (Sheets). Retorna null se não achar ou se o
 * perfil encontrado não for GESTOR.
 */
export async function resolveGestorId(identificador: string): Promise<string | null> {
  const id = identificador.trim();
  if (!id) return null;

  const admin = createAdminClient();

  const { data: byUsername } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "GESTOR")
    .eq("username", id)
    .maybeSingle();
  if (byUsername) return byUsername.id;

  const { data: byEmail } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "GESTOR")
    .eq("email_corporativo", id)
    .maybeSingle();

  return byEmail?.id ?? null;
}
