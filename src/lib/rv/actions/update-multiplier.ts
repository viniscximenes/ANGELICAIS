"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export type UpdateMultiplierInput = {
  id: string;
  displayName: string;
  kpiSlug: string;
  forecastKpiSlug: string;
  capAt100Pct: boolean;
};

export type UpdateMultiplierResult =
  | { success: true }
  | { success: false; error: string };

export async function updateMultiplierAction(
  input: UpdateMultiplierInput,
): Promise<UpdateMultiplierResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system")) {
    return { success: false, error: "Sem permissão" };
  }

  if (!input.displayName.trim())
    return { success: false, error: "Nome obrigatório" };
  if (!input.kpiSlug.trim() || !input.forecastKpiSlug.trim()) {
    return { success: false, error: "KPIs obrigatórios" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("rv_multiplier")
    .update({
      display_name: input.displayName.trim(),
      kpi_slug: input.kpiSlug.trim(),
      forecast_kpi_slug: input.forecastKpiSlug.trim(),
      cap_at_100_pct: input.capAt100Pct,
    })
    .eq("id", input.id);

  if (error) {
    console.error("[update-multiplier] erro:", error);
    return { success: false, error: "Falha ao salvar" };
  }

  revalidatePath("/config/rv");
  revalidatePath("/rv/atual");
  revalidatePath("/rv/passado");
  return { success: true };
}
