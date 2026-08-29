import { createClient } from "@/lib/supabase/server";
import { getEmailVariants } from "@/lib/utils/email-variants";

/**
 * Resolve TODOS os emails candidatos de um operador para busca de KPI:
 * email_corporativo + email_corporativo_alias_kpi (se houver), cada um com
 * suas variantes de domínio (getEmailVariants).
 *
 * Diferente de resolveKpiEmailsForProfiles/resolveKpiEmailForProfile (que
 * escolhem UM email canônico checando se ele "já tem dado" sem filtrar por
 * mês) — esse pre-check não é ciente do mes_ref, então quebra quando o
 * mesmo operador tem dado em MESES DIFERENTES sob emails diferentes (ex:
 * dado de Julho no email principal, dado de Agosto só no alias — o
 * pre-check acha que o principal "já tem dado" — de outro mês — e nunca
 * troca pro alias).
 *
 * Aqui devolvemos TODOS os candidatos; o caller consulta kpi_monthly_snapshots
 * já filtrado por mes_ref usando a lista inteira e consolida o que vier de
 * volta — sem tentar adivinhar qual email "é o certo" de antemão.
 *
 * Retorna Map<emailOriginal (normalizado), candidatos[]> — candidatos
 * sempre inclui as variantes do próprio emailOriginal.
 */
export async function resolveKpiEmailCandidatesForProfiles(
  emails: string[],
): Promise<Map<string, string[]>> {
  const supabase = await createClient();
  const normalizedEmails = [...new Set(emails.map((e) => e.trim().toLowerCase()))];
  const result = new Map<string, string[]>();

  if (normalizedEmails.length === 0) return result;

  const { data: profilesRows } = await supabase
    .from("profiles")
    .select("email_corporativo, email_corporativo_alias_kpi")
    .in("email_corporativo", normalizedEmails);

  const aliasPorEmail = new Map<string, string>();
  for (const p of profilesRows ?? []) {
    if (p.email_corporativo_alias_kpi) {
      aliasPorEmail.set(
        p.email_corporativo.trim().toLowerCase(),
        p.email_corporativo_alias_kpi.trim().toLowerCase(),
      );
    }
  }

  for (const email of normalizedEmails) {
    const candidatos = new Set<string>(getEmailVariants(email));
    const alias = aliasPorEmail.get(email);
    if (alias) {
      for (const variante of getEmailVariants(alias)) candidatos.add(variante);
    }
    result.set(email, [...candidatos]);
  }

  return result;
}
