"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isValidUsernameFormat } from "@/lib/users/validate-username";
import type { UserRole } from "./get-current-user";
import { limparFalhasLogin, loginBloqueado, registrarFalhaLogin } from "./login-rate-limit";
import { getPostLoginPath } from "./post-login-path";

type LoginResult = {
  success: false;
  error: "credenciais" | "conexao" | "inativo" | "bloqueado";
};

export async function loginAction(
  usernameBruto: string,
  password: string,
): Promise<LoginResult | void> {
  // Server action é um endpoint público: os argumentos podem chegar com
  // qualquer tipo/tamanho, não só o que o login-form manda.
  if (typeof usernameBruto !== "string" || typeof password !== "string") {
    return { success: false, error: "credenciais" };
  }
  const username = usernameBruto.trim().toLowerCase();
  if (!isValidUsernameFormat(username) || password.length === 0 || password.length > 200) {
    return { success: false, error: "credenciais" };
  }

  if (await loginBloqueado(username)) {
    return { success: false, error: "bloqueado" };
  }

  const email = `${username}@interno.angelicais.app`;

  let redirectPath = "/s/reports/consolidado";

  try {
    const supabase = await createClient();
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      await registrarFalhaLogin(username);
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

      await limparFalhasLogin(username);
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
