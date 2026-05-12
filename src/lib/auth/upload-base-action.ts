"use server";

import { revalidatePath } from "next/cache";

import { uploadBaseToSheet } from "@/lib/google/d1/upload";
import { getCurrentUser } from "./get-current-user";
import { can } from "./permissions";

export type UploadActionResult =
  | { success: true; rowsWritten: number }
  | { success: false; error: string };

export async function uploadBaseAction(
  parsedRows: string[][],
): Promise<UploadActionResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: "Não autenticado" };
  }

  if (!can(user.profile.role, "manage_base")) {
    return { success: false, error: "Sem permissão para atualizar a base" };
  }

  const result = await uploadBaseToSheet(parsedRows);

  if (result.success) {
    revalidatePath("/d-1");
  }

  return result;
}
