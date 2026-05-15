"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export type AddDeflatorInput = {
  operatorEmail: string;
  deflatorTypeId: string;
  mesRef: string;
};

export type AddDeflatorResult =
  | { success: true }
  | { success: false; error: string };

export async function addDeflatorOccurrenceAction(
  input: AddDeflatorInput,
): Promise<AddDeflatorResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system")) {
    return { success: false, error: "Sem permissão" };
  }

  if (!input.operatorEmail.trim()) {
    return { success: false, error: "Operador obrigatório" };
  }
  if (!input.deflatorTypeId.trim()) {
    return { success: false, error: "Deflator obrigatório" };
  }
  if (!input.mesRef.match(/^\d{4}-\d{2}-01$/)) {
    return { success: false, error: "Mês inválido" };
  }

  const normalizedEmail = input.operatorEmail.trim().toLowerCase();
  const supabase = await createClient();

  const { data: existing, error: readErr } = await supabase
    .from("rv_deflator_applications")
    .select("id, occurrence_count")
    .eq("operator_email", normalizedEmail)
    .eq("mes_ref", input.mesRef)
    .eq("deflator_type_id", input.deflatorTypeId)
    .maybeSingle();

  if (readErr) {
    console.error("[add-deflator] erro leitura:", readErr);
    return { success: false, error: "Erro ao consultar banco" };
  }

  if (existing) {
    const { error: updErr } = await supabase
      .from("rv_deflator_applications")
      .update({ occurrence_count: existing.occurrence_count + 1 })
      .eq("id", existing.id);

    if (updErr) {
      console.error("[add-deflator] erro update:", updErr);
      return { success: false, error: "Erro ao atualizar" };
    }
  } else {
    const { error: insErr } = await supabase
      .from("rv_deflator_applications")
      .insert({
        operator_email: normalizedEmail,
        mes_ref: input.mesRef,
        deflator_type_id: input.deflatorTypeId,
        occurrence_count: 1,
        applied_by: user.profile.id,
      });

    if (insErr) {
      console.error("[add-deflator] erro insert:", insErr);
      return { success: false, error: "Erro ao inserir" };
    }
  }

  revalidatePath("/config/rv");
  revalidatePath("/rv/atual");
  revalidatePath("/rv/passado");
  return { success: true };
}
