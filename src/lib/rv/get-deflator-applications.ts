import { createClient } from "@/lib/supabase/server";

import type { DeflatorApplication } from "./types";

/**
 * Aplicações de deflator manual de um operador num mês específico.
 */
export async function getDeflatorApplications(
  operatorEmail: string,
  mesRef: string,
): Promise<DeflatorApplication[]> {
  const supabase = await createClient();
  const normalizedEmail = operatorEmail.trim().toLowerCase();

  const { data, error } = await supabase
    .from("rv_deflator_applications")
    .select(
      "id, operator_email, mes_ref, deflator_type_id, deflator_slug, occurrence_count, notes, applied_by, applied_at",
    )
    .eq("operator_email", normalizedEmail)
    .eq("mes_ref", mesRef);

  if (error) {
    console.error("[get-deflator-applications] erro:", error);
    return [];
  }

  return (data ?? []).map((r) => ({
    id: r.id,
    operatorEmail: r.operator_email,
    mesRef: r.mes_ref,
    deflatorTypeId: r.deflator_type_id,
    deflatorSlug: r.deflator_slug ?? null,
    occurrenceCount: r.occurrence_count,
    notes: r.notes,
    appliedBy: r.applied_by,
    appliedAt: r.applied_at,
  }));
}

/**
 * Aplicações de deflator manual de todos os operadores num mês.
 * Usado na tab "Aplicar Deflator" de /config/rv.
 */
export async function getAllDeflatorApplicationsForMonth(
  mesRef: string,
): Promise<DeflatorApplication[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rv_deflator_applications")
    .select(
      "id, operator_email, mes_ref, deflator_type_id, deflator_slug, occurrence_count, notes, applied_by, applied_at",
    )
    .eq("mes_ref", mesRef)
    .order("operator_email");

  if (error) {
    console.error("[get-all-deflator-applications-month] erro:", error);
    return [];
  }

  return (data ?? []).map((r) => ({
    id: r.id,
    operatorEmail: r.operator_email,
    mesRef: r.mes_ref,
    deflatorTypeId: r.deflator_type_id,
    deflatorSlug: r.deflator_slug ?? null,
    occurrenceCount: r.occurrence_count,
    notes: r.notes,
    appliedBy: r.applied_by,
    appliedAt: r.applied_at,
  }));
}
