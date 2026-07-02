"use server";

import Papa from "papaparse";
import { revalidatePath } from "next/cache";

import { uploadBase2ToSheet } from "@/lib/google/d1/tempo-logado/upload";
import { getCurrentUser } from "./get-current-user";
import { can } from "./permissions";

export type UploadActionResult =
  | { success: true; rowsWritten: number }
  | { success: false; error: string };

export async function uploadBase2Action(
  csvText: string,
): Promise<UploadActionResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: "Não autenticado" };
  }

  if (!can(user.profile.role, "manage_d1_base")) {
    return { success: false, error: "Sem permissão para atualizar a base" };
  }

  // Parse server-side (CSV grande não trafega como matriz aninhada via RSC)
  const parseResult = Papa.parse<string[]>(csvText, {
    skipEmptyLines: true,
  });

  if (parseResult.errors.length > 0) {
    return { success: false, error: "Erro ao processar CSV no servidor" };
  }

  const rows = parseResult.data.filter((row) =>
    row.some((cell) => cell !== ""),
  );

  const result = await uploadBase2ToSheet(rows, user.profile.fullName);

  if (result.success) {
    revalidatePath("/d-1/tempo-logado");
  }

  return result;
}
