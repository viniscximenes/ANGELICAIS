"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

import type { Direction, Faixa } from "../types";

export type UpdateTieredInput = {
  id: string;
  displayName: string;
  kpiSlug: string;
  direction: Direction;
  faixas: Faixa[];
  requiresIndicatorSlug: string | null;
  requiresThreshold: number | null;
};

export type UpdateTieredResult =
  | { success: true }
  | { success: false; error: string };

export async function updateTieredIndicatorAction(
  input: UpdateTieredInput,
): Promise<UpdateTieredResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system")) {
    return { success: false, error: "Sem permissão" };
  }

  if (!input.displayName.trim())
    return { success: false, error: "Nome obrigatório" };
  if (!input.kpiSlug.trim())
    return { success: false, error: "KPI obrigatório" };
  if (!Array.isArray(input.faixas) || input.faixas.length === 0) {
    return { success: false, error: "Pelo menos uma faixa é obrigatória" };
  }

  for (const f of input.faixas) {
    if (typeof f.threshold !== "number" || typeof f.value !== "number") {
      return { success: false, error: "Faixa com valores inválidos" };
    }
    if (f.value < 0) {
      return { success: false, error: "Valor de faixa não pode ser negativo" };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("rv_tiered_indicators")
    .update({
      display_name: input.displayName.trim(),
      kpi_slug: input.kpiSlug.trim(),
      direction: input.direction,
      faixas: input.faixas,
      requires_indicator_slug: input.requiresIndicatorSlug,
      requires_threshold: input.requiresThreshold,
    })
    .eq("id", input.id);

  if (error) {
    console.error("[update-tiered] erro:", error);
    return { success: false, error: "Falha ao salvar" };
  }

  revalidatePath("/config/rv");
  revalidatePath("/rv/atual");
  revalidatePath("/rv/passado");
  return { success: true };
}
