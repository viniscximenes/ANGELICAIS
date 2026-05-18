import { createClient } from "@/lib/supabase/server";

import type { UserProfile, UserRole } from "./types";

export async function getUserById(id: string): Promise<UserProfile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, username, full_name, email_corporativo, email_corporativo_alias_kpi, role, is_active, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[get-user-by-id] erro:", error);
    return null;
  }

  return {
    id: data.id,
    username: data.username,
    fullName: data.full_name,
    emailInterno: `${data.username}@interno.angelicais.app`,
    emailCorporativo: data.email_corporativo,
    emailCorporativoAliasKpi: data.email_corporativo_alias_kpi,
    role: data.role as UserRole,
    isActive: data.is_active,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
