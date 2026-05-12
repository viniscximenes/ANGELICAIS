"use server";

import { revalidatePath } from "next/cache";

import { uploadBaseToSheet } from "@/lib/google/d1/upload";

export type UploadActionResult =
  | { success: true; rowsWritten: number }
  | { success: false; error: string };

export async function uploadBaseAction(
  parsedRows: string[][],
): Promise<UploadActionResult> {
  const result = await uploadBaseToSheet(parsedRows);

  if (result.success) {
    // Invalida o cache da página /d-1 pra próxima visita ter dados frescos
    revalidatePath("/d-1");
  }

  return result;
}
