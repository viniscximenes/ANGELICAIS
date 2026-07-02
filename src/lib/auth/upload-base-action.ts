"use server";

import { revalidatePath } from "next/cache";

import { saveEvolucaoAction } from "@/lib/d1/evolucao/actions/save-evolucao-action";
import { fetchConsolidado } from "@/lib/google/d1";
import {
  fetchUltimoReportInfo,
  uploadBaseToSheet,
} from "@/lib/google/d1/upload";
import { getCurrentUser } from "./get-current-user";
import { can } from "./permissions";

export type UploadActionResult =
  | { success: true; rowsWritten: number }
  | { success: false; error: string };

/**
 * Lê a hora e o nome do supervisor do último report (BASE - 1!S2:T2) para a
 * regra dos 5 min no client. Gated por manage_d1_base. Retorna nulls em
 * qualquer falha (a regra é apenas um aviso — nunca bloqueia o upload).
 */
export async function getUltimoReportHoraAction(): Promise<{
  hora: string | null;
  nomeSupervisor: string | null;
}> {
  const user = await getCurrentUser();
  if (!user || !can(user.profile.role, "manage_d1_base")) {
    return { hora: null, nomeSupervisor: null };
  }
  try {
    return await fetchUltimoReportInfo();
  } catch (err) {
    console.error("[upload-base] erro ao ler hora do report (S2:T2):", err);
    return { hora: null, nomeSupervisor: null };
  }
}

export async function uploadBaseAction(
  parsedRows: string[][],
): Promise<UploadActionResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: "Não autenticado" };
  }

  if (!can(user.profile.role, "manage_d1_base")) {
    return { success: false, error: "Sem permissão para atualizar a base" };
  }

  const result = await uploadBaseToSheet(parsedRows, user.profile.fullName);

  if (result.success) {
    // Snapshot da evolução da TX (complementar — falha silenciosa não bloqueia upload).
    try {
      const consolidado = await fetchConsolidado();
      // FASE 1: a estrutura nova não tem mais um total único de equipe. Como
      // stopgap, usa a TX agregada da empresa (Σ retidos / Σ pedidos sobre
      // todos os operadores). Revisitar na Fase 2 quando houver seleção de
      // supervisor / definição de qual TX registrar.
      const totalRetidos = consolidado.operadores.reduce(
        (acc, op) => acc + op.retidos,
        0,
      );
      const totalPedidos = consolidado.operadores.reduce(
        (acc, op) => acc + op.pedidos,
        0,
      );
      const tx = totalPedidos > 0 ? totalRetidos / totalPedidos : null;
      if (tx !== null && !isNaN(tx)) {
        const snapshotResult = await saveEvolucaoAction(tx * 100);
        if (!snapshotResult.success) {
          console.error(
            "[upload-base] falha ao salvar snapshot evolução:",
            snapshotResult.error,
          );
        }
      }
    } catch (err) {
      console.error("[upload-base] erro ao processar snapshot:", err);
    }

    revalidatePath("/d-1");
  }

  return result;
}

export async function clearBaseAction(): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: "Não autenticado" };
  }

  if (!can(user.profile.role, "manage_d1_base")) {
    return { success: false, error: "Sem permissão para limpar a base" };
  }

  try {
    const { getSheetsClient } = await import("@/lib/google/sheets-client");
    const { sheets, sheetId } = getSheetsClient();
    const BASE_SHEET = "BASE - 1";
    const CONSOLIDADO_SHEET = "CONSOLIDADO";
    const MAX_ROWS = 10000;

    // Limpa a tabela BASE - 1 (preservando o cabeçalho)
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: `'${BASE_SHEET}'!A2:R${MAX_ROWS}`,
    });

    // Grava "—" (limpo) nos horários de report
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: [
          { range: `'${BASE_SHEET}'!S2`, values: [["—"]] },
          { range: `'${CONSOLIDADO_SHEET}'!L2`, values: [["—"]] },
        ],
      },
    });

    revalidatePath("/d-1");
    return { success: true };
  } catch (err) {
    console.error("[clear-base] erro:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao limpar dados no Sheets",
    };
  }
}
