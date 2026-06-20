/**
 * Diagnóstico: verifica se o cliente admin (service role) enxerga os dados
 * que a página /operacional/kpi deveria exibir.
 *
 * Roda com: npx tsx scripts/inspect-rls-kpi-gestor.ts
 *
 * O que este script testa:
 * 1. Qual mes_ref está disponível no banco (para confirmar o formato correto).
 * 2. Se o ILIKE com o nome do gestor encontra rows (com service role = bypass RLS).
 * 3. Se encontrou, o problema na página é autenticação/RLS (não o query em si).
 *
 * Altere GESTOR_FULL_NAME abaixo para o full_name do gestor logado.
 */

import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !serviceKey) {
  console.error("Variáveis de ambiente não encontradas.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── AJUSTE AQUI ────────────────────────────────────────────────────────────
const GESTOR_FULL_NAME = "Ana Angelica Mattos Goncalves"; // fullName do gestor
// ─────────────────────────────────────────────────────────────────────────────

void (async () => {
  // 1. Quais mes_ref existem na tabela? (confirma formato)
  const { data: refs, error: refsErr } = await admin
    .from("kpi_monthly_snapshots")
    .select("mes_ref")
    .eq("kpi_slug", "meta_gestor")
    .order("mes_ref", { ascending: false })
    .limit(5);

  if (refsErr) {
    console.error("Erro ao buscar mes_ref:", refsErr);
  } else {
    const distinct = [...new Set((refs ?? []).map((r) => r.mes_ref))];
    console.log("mes_ref disponíveis (últimos 5):", distinct);
  }

  // 2. Filtro derivado do fullName (mesma lógica de getOperadoresDoGestor)
  const palavras = GESTOR_FULL_NAME.trim().toUpperCase().split(/\s+/).filter(Boolean);
  const filtro = palavras.slice(0, 2).join(" ");
  console.log("\nFiltro ILIKE gerado:", `%${filtro}%`);

  // 3. Buscar com mes_ref no formato YYYY-MM-01 (formato correto)
  const now = new Date();
  const mesRef = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  console.log("mes_ref testado:", mesRef);

  const { data: ops, error: opsErr } = await admin
    .from("kpi_monthly_snapshots")
    .select("operator_email, valor_texto")
    .eq("mes_ref", mesRef)
    .eq("kpi_slug", "meta_gestor")
    .ilike("valor_texto", `%${filtro}%`);

  if (opsErr) {
    console.error("\nErro na query de operadores:", opsErr);
  } else {
    console.log(`\nOperadores encontrados (admin/service role): ${ops?.length ?? 0}`);
    if (ops && ops.length > 0) {
      console.log("Primeiros 3:", ops.slice(0, 3));
      console.log(
        "\n→ O query FUNCIONA com service role.",
        "\n→ Se a página falha, o problema é: RLS bloqueando o GESTOR autenticado,",
        "\n  ou falta de GRANT SELECT para o role 'authenticated' na tabela.",
      );
    } else {
      console.log(
        "\n→ Nenhum resultado MESMO com service role.",
        "\n→ Causas possíveis:",
        "\n   1. mes_ref errado — confira os 'mes_ref disponíveis' acima.",
        "\n   2. fullName do gestor não bate com valor_texto no banco.",
        "\n   3. A tabela está vazia para este mês.",
      );
    }
  }

  // 4. Testar também sem o -01 (para confirmar o bug do formato antigo)
  const mesRefSemDia = mesRef.slice(0, 7); // "2026-06"
  const { data: semDia } = await admin
    .from("kpi_monthly_snapshots")
    .select("operator_email")
    .eq("mes_ref", mesRefSemDia)
    .eq("kpi_slug", "meta_gestor")
    .limit(1);

  console.log(
    `\nTeste mes_ref sem -01 ("${mesRefSemDia}"): ${semDia?.length ?? 0} rows`,
    semDia && semDia.length === 0
      ? "→ Confirma: banco usa YYYY-MM-01, não YYYY-MM."
      : "→ Banco aceita os dois formatos.",
  );
})();
