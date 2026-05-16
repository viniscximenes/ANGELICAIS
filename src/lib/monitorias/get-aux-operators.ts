import { createClient } from "@/lib/supabase/server";

export type AuxItem = {
  id: string;
  fullName: string;
  emailCorporativo: string;
};

/**
 * Profiles com role = AUX, ordenados por nome.
 */
export async function getAuxOperators(): Promise<AuxItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email_corporativo")
    .eq("role", "AUX")
    .order("full_name");

  if (error) {
    console.error("[get-aux-operators] erro:", error);
    return [];
  }

  return (data ?? []).map((p) => ({
    id: p.id,
    fullName: p.full_name,
    emailCorporativo: p.email_corporativo,
  }));
}
