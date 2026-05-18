import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com SERVICE_ROLE_KEY. Ignora RLS.
 * USAR APENAS EM SERVER ACTIONS — nunca expor ao cliente.
 *
 * Lança erro se SUPABASE_SERVICE_ROLE_KEY não estiver configurada.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL não configurada");
  }

  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada. Painel de usuários não funcionará sem ela.",
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
