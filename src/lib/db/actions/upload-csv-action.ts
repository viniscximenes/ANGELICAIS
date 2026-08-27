"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { parseCsvPausas } from "@/lib/db/parse-csv-pausas";
import { aplicarRetencaoPausas } from "@/lib/db/retencao-pausas";
import { salvarCsvPausas } from "@/lib/db/salvar-csv-pausas";

export type UploadCsvResult =
  | { success: true; dataRef: string; rowsWritten: number }
  | { success: false; error: string };

/**
 * Data mais frequente entre as linhas parseadas — normalmente só há uma,
 * mas o CSV pode ter divergência pontual (linha de virada de dia, etc).
 */
function dataMaisFrequente(datas: string[]): string {
  const contagem = new Map<string, number>();
  for (const data of datas) {
    contagem.set(data, (contagem.get(data) ?? 0) + 1);
  }

  let dataRef = datas[0];
  let maxCount = 0;
  for (const [data, count] of contagem) {
    if (count > maxCount) {
      maxCount = count;
      dataRef = data;
    }
  }
  return dataRef;
}

/**
 * Recebe o CSV em base64 — preserva os bytes crus do arquivo (o parser
 * precisa deles pra detectar/corrigir o encoding Latin-1/Windows-1252 e o
 * mojibake, o que uma string já decodificada no client perderia).
 */
export async function uploadCsvAction(
  fileBase64: string,
): Promise<UploadCsvResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system", user.profile.isAdminSkill)) {
    return { success: false, error: "Sem permissão para subir o CSV" };
  }

  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(Buffer.from(fileBase64, "base64"));
  } catch {
    return { success: false, error: "Arquivo inválido" };
  }

  let parseResult;
  try {
    parseResult = parseCsvPausas(bytes);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao ler o CSV",
    };
  }

  if (parseResult.linhas.length === 0) {
    return {
      success: false,
      error: "Nenhuma linha válida encontrada no CSV.",
    };
  }

  const dataRef = dataMaisFrequente(
    parseResult.linhas.map((l) => l.data_ref),
  );

  const salvarResult = await salvarCsvPausas(parseResult.linhas);
  if (!salvarResult.success) {
    return {
      success: false,
      error: salvarResult.error || "Erro ao salvar o CSV",
    };
  }

  const retencaoResult = await aplicarRetencaoPausas();
  if (!retencaoResult.success) {
    console.warn(
      "[upload-csv-action] retenção falhou (upload prosseguiu normalmente):",
      retencaoResult.error,
    );
  }

  revalidatePath("/config/db");

  return { success: true, dataRef, rowsWritten: salvarResult.rowsWritten };
}
