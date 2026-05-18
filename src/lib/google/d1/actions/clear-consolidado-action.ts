"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";

import { getSheetsClient } from "../../sheets-client";

const BASE_SHEET = "BASE - 1";
const CONSOLIDADO_SHEET = "CONSOLIDADO";
const MAX_ROWS = 10000;

export type ClearConsolidadoResult =
  | { success: true }
  | { success: false; error: string };

export async function clearConsolidadoAction(): Promise<ClearConsolidadoResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_base")) {
    return { success: false, error: "Sem permissão para limpar a base" };
  }

  try {
    const { sheets, sheetId } = getSheetsClient();

    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: `'${BASE_SHEET}'!A2:R${MAX_ROWS}`,
    });

    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: `'${CONSOLIDADO_SHEET}'!L2`,
    });

    revalidatePath("/d-1");
    return { success: true };
  } catch (err) {
    console.error("[clear-consolidado] erro:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro desconhecido",
    };
  }
}
