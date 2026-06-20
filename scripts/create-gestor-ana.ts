/**
 * TEMPORÁRIO — cria a usuária gestora Ana Angelica (role GESTOR).
 * Rodar uma vez:  npx tsx scripts/create-gestor-ana.ts
 * Apagar depois.
 *
 * Padrão do create-user-action (auth.admin.createUser + insert em profiles),
 * mas standalone. Precisa de NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
 * no .env.local.
 *
 * IMPORTANTE: o email_corporativo "ana.angelica@alloha.com" e o username
 * "ana.angelica" são exatamente as chaves que o resolveGuiaGestor (Fase 1)
 * mapeia para a guia "ANA ANGELICA".
 */
import { readFileSync } from "node:fs";

// Carrega .env.local manualmente (não há dotenv/Next aqui).
const envText = readFileSync(".env.local", "utf-8");
for (const line of envText.split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (!m) continue;
  const [, k] = m;
  let v = m[2];
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  if (!(k in process.env)) process.env[k] = v;
}

import { createAdminClient } from "@/lib/supabase/admin";

const EMAIL_INTERNO = "ana.angelica@interno.angelicais.app";
const EMAIL_CORP = "ana.angelica@alloha.com";
const USERNAME = "ana.angelica";
const FULL_NAME = "Ana Angelica Mattos Goncalves";
const PASSWORD = "Gestor2026";

async function main() {
  const admin = createAdminClient();

  const { data: authUser, error: authError } =
    await admin.auth.admin.createUser({
      email: EMAIL_INTERNO,
      password: PASSWORD,
      email_confirm: true,
    });

  if (authError || !authUser.user) {
    console.error("AUTH_ERROR:", authError?.message ?? "sem user");
    process.exit(1);
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: authUser.user.id,
    username: USERNAME,
    full_name: FULL_NAME,
    email_corporativo: EMAIL_CORP,
    role: "GESTOR",
    is_active: true,
  });

  if (profileError) {
    // Rollback do auth user para não deixar conta órfã.
    await admin.auth.admin.deleteUser(authUser.user.id);
    console.error("PROFILE_ERROR:", profileError.message);
    process.exit(1);
  }

  console.log("OK — usuária criada:");
  console.log("  id:", authUser.user.id);
  console.log("  login:", USERNAME, "/ senha:", PASSWORD);
  console.log("  email_corporativo:", EMAIL_CORP, "→ guia ANA ANGELICA");
}

main().catch((err) => {
  console.error("UNEXPECTED_ERROR:", err);
  process.exit(1);
});
