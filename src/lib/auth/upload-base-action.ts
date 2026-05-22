"use server";

import { revalidatePath } from "next/cache";

import { saveEvolucaoAction } from "@/lib/d1/evolucao/actions/save-evolucao-action";
import { fetchConsolidado } from "@/lib/google/d1";
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
    // Snapshot da evolução da TX (complementar — falha silenciosa não bloqueia upload).
    try {
      const consolidado = await fetchConsolidado();
      const tx = consolidado.equipe.txRetencao;
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
