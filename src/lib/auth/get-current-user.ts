import { createClient } from "@/lib/supabase/server";

export type UserRole = "ADM" | "GESTOR";

type UserProfile = {
  id: string;
  username: string;
  emailCorporativo: string;
  fullName: string;
  role: UserRole;
  /**
   * Flag aditiva: GESTOR que também acumula acesso administrativo (Painel
   * Adm), sem perder o que já tinha como GESTOR. Não confundir com
   * role === "ADM" (admin exclusivo, sem acesso operacional) — irrelevante
   * pra qualquer role que não seja GESTOR.
   */
  isAdminSkill: boolean;
  themePreference: "dark" | "light";
};

type CurrentUser = {
  authId: string;
  emailInterno: string;
  profile: UserProfile;
};

/**
 * Retorna o usuário autenticado + seu profile completo.
 * Retorna null se não houver sessão ou se o profile não for encontrado.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, username, email_corporativo, full_name, role, is_active, theme_preference, is_admin_skill",
    )
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    console.error(
      "[getCurrentUser] profile não encontrado para user",
      user.id,
    );
    return null;
  }

  if (profile.is_active === false) {
    await supabase.auth.signOut();
    return null;
  }

  return {
    authId: user.id,
    emailInterno: user.email || "",
    profile: {
      id: profile.id,
      username: profile.username,
      emailCorporativo: profile.email_corporativo,
      fullName: profile.full_name,
      role: profile.role as UserRole,
      isAdminSkill: profile.is_admin_skill === true,
      themePreference: profile.theme_preference as "dark" | "light",
    },
  };
}
