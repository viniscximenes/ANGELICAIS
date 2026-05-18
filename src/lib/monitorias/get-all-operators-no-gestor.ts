import { createClient } from "@/lib/supabase/server";

export type OperatorItem = {
  id: string;
  fullName: string;
  emailCorporativo: string;
  role: string;
};

/**
 * Todos os profiles exceto GESTOR.
 */
export async function getAllOperatorsNoGestor(): Promise<OperatorItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email_corporativo, role")
    .neq("role", "GESTOR")
    .eq("is_active", true)
    .order("full_name");

  if (error) {
    console.error("[get-all-operators-no-gestor] erro:", error);
    return [];
  }

  return (data ?? []).map((p) => ({
    id: p.id,
    fullName: p.full_name,
    emailCorporativo: p.email_corporativo,
    role: p.role,
  }));
}
