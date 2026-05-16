import { createClient } from "@/lib/supabase/server";

/**
 * Resolve qual email usar para buscar KPI de um operador.
 *
 * 1. Tenta o email_corporativo principal.
 * 2. Se não houver dados em kpi_monthly_snapshots, tenta o
 *    email_corporativo_alias_kpi (se existir).
 *
 * Retorna o email que tem dados, ou o principal se nenhum tem.
 */
export async function resolveKpiEmailForProfile(
  emailCorporativo: string,
): Promise<string> {
  const supabase = await createClient();
  const normalizedEmail = emailCorporativo.trim().toLowerCase();

  const { data: principalRows } = await supabase
    .from("kpi_monthly_snapshots")
    .select("kpi_slug")
    .eq("operator_email", normalizedEmail)
    .limit(1);

  if (principalRows && principalRows.length > 0) {
    return normalizedEmail;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email_corporativo_alias_kpi")
    .eq("email_corporativo", normalizedEmail)
    .maybeSingle();

  if (profile?.email_corporativo_alias_kpi) {
    return profile.email_corporativo_alias_kpi.trim().toLowerCase();
  }

  return normalizedEmail;
}

/**
 * Versão batch: resolve emails de vários profiles de uma vez.
 * Retorna Map<emailOriginal, emailParaUsarNoKpi>.
 */
export async function resolveKpiEmailsForProfiles(
  emails: string[],
): Promise<Map<string, string>> {
  const supabase = await createClient();
  const normalizedEmails = emails.map((e) => e.trim().toLowerCase());
  const result = new Map<string, string>();

  for (const email of normalizedEmails) {
    result.set(email, email);
  }

  if (normalizedEmails.length === 0) return result;

  const { data: existingKpi } = await supabase
    .from("kpi_monthly_snapshots")
    .select("operator_email")
    .in("operator_email", normalizedEmails);

  const emailsWithKpi = new Set(
    (existingKpi ?? []).map((r) => r.operator_email.toLowerCase()),
  );

  const emailsWithoutKpi = normalizedEmails.filter(
    (e) => !emailsWithKpi.has(e),
  );

  if (emailsWithoutKpi.length === 0) return result;

  const { data: profilesWithAlias } = await supabase
    .from("profiles")
    .select("email_corporativo, email_corporativo_alias_kpi")
    .in("email_corporativo", emailsWithoutKpi)
    .not("email_corporativo_alias_kpi", "is", null);

  for (const p of profilesWithAlias ?? []) {
    if (p.email_corporativo_alias_kpi) {
      result.set(
        p.email_corporativo.trim().toLowerCase(),
        p.email_corporativo_alias_kpi.trim().toLowerCase(),
      );
    }
  }

  return result;
}
