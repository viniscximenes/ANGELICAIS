"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type LoginResult = {
  success: false;
  error: "credenciais" | "conexao";
};

export async function loginAction(
  username: string,
  password: string,
): Promise<LoginResult | void> {
  const email = `${username}@interno.angelicais.app`;

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: "credenciais" };
    }
  } catch (err) {
    console.error("[login] exception", err);
    return { success: false, error: "conexao" };
  }

  // Redirect server-side. NÃO pode estar dentro do try/catch
  // porque o redirect() lança uma exceção especial que o Next
  // intercepta. Se estiver no try, o catch engoliria.
  redirect("/d-1");
}
