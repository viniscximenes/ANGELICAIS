import { createClient } from "@/lib/supabase/server";

export type OperatorListItem = {
  id: string;
  fullName: string;
  emailCorporativo: string;
  role: string;
};

/**
 * Todos os profiles ordenados por nome. Útil pra dropdowns de seleção
 * de operador.
 */
export async function getAllOperatorsWithEmails(): Promise<OperatorListItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email_corporativo, role")
    .eq("is_active", true)
    .order("full_name");

  if (error) {
    console.error("[get-all-operators-with-emails] erro:", error);
    return [];
  }

  return (data ?? []).map((p) => ({
    id: p.id,
    fullName: p.full_name,
    emailCorporativo: p.email_corporativo,
    role: p.role,
  }));
}
