"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

import type { PerUnitFaixa } from "../types";

export type UpsertPerUnitInput = {
  id?: string; // se presente, update; senão insert
  ruleSetId: string;
  slug: string;
  displayName: string;
  txKpiSlug: string;
  countSource: string;
  faixas: PerUnitFaixa[];
  displayOrder: number;
};

export type UpsertPerUnitResult =
  | { success: true; id: string }
  | { success: false; error: string };

export async function upsertPerUnitIndicatorAction(
  input: UpsertPerUnitInput,
): Promise<UpsertPerUnitResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system")) {
    return { success: false, error: "Sem permissão" };
  }

  if (!input.slug.trim()) return { success: false, error: "Slug obrigatório" };
  if (!input.displayName.trim())
    return { success: false, error: "Nome obrigatório" };
  if (!input.txKpiSlug.trim())
    return { success: false, error: "KPI da TX obrigatório" };
  if (!input.countSource.trim())
    return { success: false, error: "Fonte da contagem obrigatória" };

  // Validação básica das faixas
  if (!Array.isArray(input.faixas) || input.faixas.length === 0) {
    return { success: false, error: "Adicione ao menos uma faixa" };
  }
  for (const f of input.faixas) {
    if (typeof f.threshold !== "number" || typeof f.value !== "number") {
      return {
        success: false,
        error: "Faixa inválida (threshold e value devem ser números)",
      };
    }
    if (f.value < 0) {
      return { success: false, error: "Valor por retido não pode ser negativo" };
    }
  }

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erro" };
  }

  const payload = {
    rule_set_id: input.ruleSetId,
    slug: input.slug.trim(),
    display_name: input.displayName.trim(),
    tx_kpi_slug: input.txKpiSlug.trim(),
    count_source: input.countSource.trim(),
    faixas: input.faixas,
    display_order: input.displayOrder,
    updated_at: new Date().toISOString(),
  };

  let result;
  if (input.id) {
    result = await adminClient
      .from("rv_per_unit_indicators")
      .update(payload)
      .eq("id", input.id)
      .select("id")
      .single();
  } else {
    result = await adminClient
      .from("rv_per_unit_indicators")
      .insert(payload)
      .select("id")
      .single();
  }

  if (result.error) {
    console.error("[upsert-per-unit] erro:", result.error);
    return { success: false, error: "Erro ao salvar" };
  }

  revalidatePath("/config/rv");
  revalidatePath("/rv/atual");
  revalidatePath("/rv/passado");
  return { success: true, id: result.data.id };
}
