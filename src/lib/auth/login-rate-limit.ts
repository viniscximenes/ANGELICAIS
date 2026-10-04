import "server-only";

import { headers } from "next/headers";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Limite de tentativas de login, server-side. O bloqueio do login-form
 * (MAX_ATTEMPTS) é só no navegador e some com um F5; este aqui vale pra
 * qualquer chamada da action. Persistido em public.login_tentativas (só
 * service_role acessa) porque na Vercel cada instância tem memória própria.
 *
 * Só FALHAS são gravadas. Login certo apaga as falhas daquele username.
 */
const JANELA_MS = 15 * 60 * 1000;
const MAX_FALHAS_POR_USERNAME = 5;
const MAX_FALHAS_POR_IP = 20;

async function getIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}

function desdeJanela() {
  return new Date(Date.now() - JANELA_MS).toISOString();
}

/** true se o username ou o IP estourou o limite na janela atual. */
export async function loginBloqueado(username: string): Promise<boolean> {
  const admin = createAdminClient();
  const ip = await getIp();
  const desde = desdeJanela();

  const porUsername = admin
    .from("login_tentativas")
    .select("id", { count: "exact", head: true })
    .eq("username", username)
    .gte("criado_em", desde);

  const porIp = ip
    ? admin
        .from("login_tentativas")
        .select("id", { count: "exact", head: true })
        .eq("ip", ip)
        .gte("criado_em", desde)
    : null;

  const [u, i] = await Promise.all([porUsername, porIp]);

  // Falha ao consultar não pode travar o login de todo mundo — segue sem limite.
  if (u.error) {
    console.error("[login-rate-limit] erro ao contar por username:", u.error.message);
    return false;
  }

  return (
    (u.count ?? 0) >= MAX_FALHAS_POR_USERNAME ||
    (i?.count ?? 0) >= MAX_FALHAS_POR_IP
  );
}

export async function registrarFalhaLogin(username: string): Promise<void> {
  const admin = createAdminClient();
  const ip = await getIp();
  const { error } = await admin.from("login_tentativas").insert({ username, ip });
  if (error) console.error("[login-rate-limit] erro ao registrar falha:", error.message);
}

/** Login certo: zera as falhas do username e aproveita pra limpar registros velhos. */
export async function limparFalhasLogin(username: string): Promise<void> {
  const admin = createAdminClient();
  await Promise.all([
    admin.from("login_tentativas").delete().eq("username", username),
    admin.from("login_tentativas").delete().lt("criado_em", desdeJanela()),
  ]);
}
