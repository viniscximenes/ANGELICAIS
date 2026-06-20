"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";

import { getSheetsClient } from "../../sheets-client";

const BASE_SHEET = "BASE - 2";
const MAX_ROWS = 50000;

export type ClearTempoLogadoResult =
  | { success: true }
  | { success: false; error: string };

export async function clearTempoLogadoAction(): Promise<ClearTempoLogadoResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_d1_base")) {
    return { success: false, error: "Sem permissão para limpar a base" };
  }

  try {
    const { sheets, sheetId } = getSheetsClient();

    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: `'${BASE_SHEET}'!A2:K${MAX_ROWS}`,
    });

    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: `'${BASE_SHEET}'!L2`,
    });

    revalidatePath("/d-1/tempo-logado");
    return { success: true };
  } catch (err) {
    console.error("[clear-tempo-logado] erro:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro desconhecido",
    };
  }
}
