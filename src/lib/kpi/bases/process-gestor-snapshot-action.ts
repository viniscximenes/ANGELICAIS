"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

import { getKpiDefinitions } from "../get-definitions";
import { extractGestorSnapshot } from "./extract-gestor-snapshot";
import { parseClipboard } from "./parse-clipboard";

export type ProcessGestorSnapshotResult =
  | {
      success: true;
      totalSupervisors: number;
      supervisors: string[];
      missingKpis: string[];
      monthsDeleted: string[];
      warnings: string[];
      detectedHeaders: string[];
      debugInfo: {
        separator: "TAB" | "VIRGULA";
        totalHeaders: number;
        rawFirstLineSample: string;
      };
    }
  | { success: false; error: string };

type ProcessGestorSnapshotInput = {
  clipboardText: string;
  mesRef: string;
  dataCorte: string;
};

const MAX_MONTHS = 24;

async function enforceGestorRetention(newMesRef: string): Promise<string[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("kpi_gestor_snapshots")
    .select("mes_ref")
    .order("mes_ref", { ascending: false });

  if (error) {
    console.error("[gestor-retention] erro ao ler meses:", error);
    return [];
  }

  const existing = new Set<string>(
    (data || []).map((r: { mes_ref: string }) => r.mes_ref as string),
  );
  existing.add(newMesRef);

  const sorted = Array.from(existing).sort().reverse();
  const toDelete = sorted.slice(MAX_MONTHS);

  if (toDelete.length === 0) return [];

  const { error: delError } = await supabase
    .from("kpi_gestor_snapshots")
    .delete()
    .in("mes_ref", toDelete);

  if (delError) {
    console.error("[gestor-retention] erro ao apagar meses:", delError);
    return [];
  }

  return toDelete;
}

export async function processGestorSnapshotAction(
  input: ProcessGestorSnapshotInput,
): Promise<ProcessGestorSnapshotResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  if (!can(user.profile.role, "manage_base", user.profile.isAdminSkill)) {
    return { success: false, error: "Sem permissão para salvar KPIs" };
  }

  if (!input.mesRef.match(/^\d{4}-\d{2}-01$/)) {
    return { success: false, error: "Mês de referência inválido" };
  }

  if (!input.dataCorte.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return { success: false, error: "Data de corte inválida" };
  }

  if (!input.clipboardText.trim()) {
    return { success: false, error: "Cole os dados primeiro" };
  }

  const parsed = parseClipboard(input.clipboardText);
  if (!parsed) {
    return { success: false, error: "Dados inválidos. Inclua o cabeçalho." };
  }

  const definitions = await getKpiDefinitions();
  const extraction = extractGestorSnapshot(parsed, definitions);

  if (extraction.supervisors.length === 0) {
    return {
      success: false,
      error:
        extraction.warnings.length > 0
          ? extraction.warnings.join("; ")
          : "Nenhum supervisor identificado. Verifique se a coluna Supervisor está presente.",
    };
  }

  const monthsDeleted = await enforceGestorRetention(input.mesRef);

  const supabase = createAdminClient();

  const upsertRows: Array<{
    supervisor_name: string;
    mes_ref: string;
    data_corte: string;
    kpi_slug: string;
    valor_numerico: number | null;
    valor_texto: string | null;
  }> = [];

  for (const sup of extraction.supervisors) {
    for (const [slug, valor] of sup.values.entries()) {
      upsertRows.push({
        supervisor_name: sup.supervisorName,
        mes_ref: input.mesRef,
        data_corte: input.dataCorte,
        kpi_slug: slug,
        valor_numerico: typeof valor === "number" ? valor : null,
        valor_texto: null,
      });
    }
  }

  if (upsertRows.length > 0) {
    const { error: upsertError } = await supabase
      .from("kpi_gestor_snapshots")
      .upsert(upsertRows, { onConflict: "supervisor_name,mes_ref,kpi_slug" });

    if (upsertError) {
      console.error("[process-gestor-snapshot] erro no upsert:", upsertError);
      return { success: false, error: "Erro ao salvar no banco" };
    }
  }

  revalidatePath("/bases/kpi");

  return {
    success: true,
    totalSupervisors: extraction.supervisors.length,
    supervisors: extraction.supervisors.map((s) => s.supervisorName).sort(),
    missingKpis: extraction.missingKpis,
    monthsDeleted,
    warnings: extraction.warnings,
    detectedHeaders: extraction.detectedHeaders,
    debugInfo: extraction.debugInfo,
  };
}
