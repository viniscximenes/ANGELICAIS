/**
 * Diagnóstico temporário: confirma, contra o projeto Supabase real usado
 * pelo app (.env.local), se `gestor_config_fantasia` tem as colunas
 * `meta_tx_retencao` e `ordem_tabela`, e reproduz a query exata de
 * getConfigTabela para ver o erro cru do PostgREST.
 *
 * Roda com: npx tsx scripts/_diagnose-gestor-config-fantasia.ts
 */

import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

console.log("Projeto (host):", url);

if (!url || !serviceKey) {
  console.error("Variáveis de ambiente ausentes (URL ou SERVICE_ROLE_KEY).");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

void (async () => {
  // 1. information_schema — verdade absoluta do banco, direto (bypassa
  // qualquer cache do PostgREST, pois usa a extensão de SQL cru se disponível
  // via rpc; se não houver rpc, cai pro fallback abaixo).
  const { data: cols, error: colsErr } = await admin
    .from("information_schema.columns" as never)
    .select("column_name, data_type")
    .eq("table_name", "gestor_config_fantasia")
    .eq("table_schema", "public");

  if (colsErr) {
    console.log(
      "\n[1] Não consegui ler information_schema via REST (esperado — PostgREST não expõe esse schema por padrão):",
      colsErr.message,
    );
  } else {
    console.log("\n[1] Colunas de gestor_config_fantasia (information_schema):");
    console.table(cols);
  }

  // 2. Reproduz a query exata de getConfigTabela, com service role (bypassa RLS)
  const { data, error } = await admin
    .from("gestor_config_fantasia")
    .select("meta_tx_retencao, ordem_tabela")
    .limit(1);

  console.log("\n[2] Query exata de getConfigTabela (service role):");
  if (error) {
    console.log("  ERRO:", JSON.stringify(error, null, 2));
  } else {
    console.log("  OK, retornou:", data);
  }

  // 3. Mesma query, mas com anon key (mais perto do client real da página,
  // que usa createServerClient com a anon key + cookies de sessão)
  const anon = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: dataAnon, error: errorAnon } = await anon
    .from("gestor_config_fantasia")
    .select("meta_tx_retencao, ordem_tabela")
    .limit(1);

  console.log("\n[3] Mesma query, com anon key (sem sessão — RLS pode bloquear):");
  if (errorAnon) {
    console.log("  ERRO:", JSON.stringify(errorAnon, null, 2));
  } else {
    console.log("  OK, retornou:", dataAnon);
  }

  // 4. select * pra ver TODAS as colunas que o PostgREST enxerga hoje nesta tabela
  const { data: full, error: fullErr } = await admin
    .from("gestor_config_fantasia")
    .select("*")
    .limit(1);

  console.log("\n[4] select * (service role) — colunas que o PostgREST reconhece:");
  if (fullErr) {
    console.log("  ERRO:", JSON.stringify(fullErr, null, 2));
  } else {
    console.log("  Colunas presentes:", full && full[0] ? Object.keys(full[0]) : "(tabela vazia, sem linhas pra inspecionar as chaves)");
  }
})();
