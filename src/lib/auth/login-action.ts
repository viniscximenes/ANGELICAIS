"use server";

import { createClient } from "@/lib/supabase/server";

type LoginResult =
  | { success: true }
  | { success: false; error: "credenciais" | "conexao" };

export async function loginAction(
  username: string,
  password: string,
): Promise<LoginResult> {
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

    return { success: true };
  } catch {
    return { success: false, error: "conexao" };
  }
}
