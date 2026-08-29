"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

type UpdateThemeInput = {
  theme: "dark" | "light";
};

type UpdateThemeResult =
  | { success: true }
  | { success: false; error: string };

export async function updateThemePreferenceAction(
  input: UpdateThemeInput,
): Promise<UpdateThemeResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  if (input.theme !== "dark" && input.theme !== "light") {
    return { success: false, error: "Tema inválido" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      theme_preference: input.theme,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.profile.id);

  if (error) {
    console.error("[update-theme] erro:", error);
    return { success: false, error: "Erro ao salvar preferência" };
  }

  revalidatePath("/", "layout");
  return { success: true };
}
