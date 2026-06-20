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
const NEW_PASSWORD = "Gestor2026";
const EXPECTED_ID = "1ff1ce0f-13b6-4e6d-acd4-4d5dff8e5684";

async function main() {
  const admin = createAdminClient();

  console.log("Buscando usuário por email:", EMAIL_INTERNO);
  
  // Lista usuários para encontrar pelo email e confirmar o ID
  const { data: usersData, error: listError } = await admin.auth.admin.listUsers();
  if (listError) {
    console.error("Erro ao listar usuários:", listError.message);
    process.exit(1);
  }

  const targetUser = usersData.users.find(u => u.email === EMAIL_INTERNO);

  if (!targetUser) {
    console.error(`Usuário com o email ${EMAIL_INTERNO} não foi encontrado.`);
    process.exit(1);
  }

  console.log("Usuário encontrado:");
  console.log("  ID real:", targetUser.id);
  console.log("  ID esperado:", EXPECTED_ID);

  if (targetUser.id !== EXPECTED_ID) {
    console.warn("AVISO: O ID do usuário difere do ID esperado.");
  }

  console.log(`Resetando a senha para '${NEW_PASSWORD}'...`);

  const { data: updatedUser, error: updateError } = await admin.auth.admin.updateUserById(
    targetUser.id,
    { password: NEW_PASSWORD }
  );

  if (updateError) {
    console.error("Erro ao atualizar a senha:", updateError.message);
    process.exit(1);
  }

  console.log("Senha resetada com sucesso para a conta ID:", updatedUser.user.id);
}

main().catch((err) => {
  console.error("Erro inesperado no script:", err);
  process.exit(1);
});
