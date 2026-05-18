import { createClient } from "@/lib/supabase/server";

import type { UserProfile, UserRole } from "./types";

export async function getAllUsers(): Promise<UserProfile[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, username, full_name, email_corporativo, email_corporativo_alias_kpi, role, is_active, created_at, updated_at",
    )
    .order("full_name");

  if (error) {
    console.error("[get-all-users] erro:", error);
    return [];
  }

  return (data ?? []).map((r) => ({
    id: r.id,
    username: r.username,
    fullName: r.full_name,
    emailInterno: `${r.username}@interno.angelicais.app`,
    emailCorporativo: r.email_corporativo,
    emailCorporativoAliasKpi: r.email_corporativo_alias_kpi,
    role: r.role as UserRole,
    isActive: r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}
