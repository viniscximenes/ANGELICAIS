"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "./get-current-user";
import { getPostLoginPath } from "./post-login-path";

type LoginResult = {
  success: false;
  error: "credenciais" | "conexao" | "inativo";
};

export async function loginAction(
  username: string,
  password: string,
): Promise<LoginResult | void> {
  const email = `${username}@interno.angelicais.app`;

  let redirectPath = "/reports/consolidado";

  try {
    const supabase = await createClient();
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: "credenciais" };
    }

    if (authData.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_active, role")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (profile && profile.is_active === false) {
        await supabase.auth.signOut();
        return { success: false, error: "inativo" };
      }

      if (profile?.role) {
        redirectPath = getPostLoginPath(profile.role as UserRole);
      }
    }
  } catch (err) {
    console.error("[login] exception", err);
    return { success: false, error: "conexao" };
  }

  // Redirect server-side. NÃO pode estar dentro do try/catch
  // porque o redirect() lança uma exceção especial que o Next
  // intercepta. Se estiver no try, o catch engoliria.
  redirect(redirectPath);
}
