"use server";

import { revalidatePath } from "next/cache";

import Papa from "papaparse";

import { saveEvolucaoAction } from "@/lib/d1/evolucao/actions/save-evolucao-action";
import { fetchConsolidado } from "@/lib/google/d1";
import {
  fetchUltimoReportInfo,
  uploadBaseToSheet,
} from "@/lib/google/d1/upload";
import { parseBaseRetencao } from "@/lib/retencao/parse-base-retencao";
import { salvarBaseRetencao } from "@/lib/retencao/salvar-base-retencao";
import { getCurrentUser } from "./get-current-user";
import { can } from "./permissions";

export type UploadActionResult =
  | { success: true; rowsWritten: number }
  | { success: false; error: string };

/**
 * Lê a hora e o nome do supervisor do último report (BASE - 1!S2, gravados
 * juntos na mesma célula) para a regra dos 5 min no client. Gated por
 * manage_d1_base. Retorna nulls em qualquer falha (a regra é apenas um
 * aviso — nunca bloqueia o upload).
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
    console.error("[upload-base] erro ao ler hora do report (S2):", err);
    return { hora: null, nomeSupervisor: null };
  }
}

export async function uploadBaseAction(
  csvText: string,
): Promise<UploadActionResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: "Não autenticado" };
  }

  if (!can(user.profile.role, "manage_d1_base")) {
    return { success: false, error: "Sem permissão para atualizar a base" };
  }

  // Parse CSV no servidor para evitar estouro de limite de aninhamento
  const parsed = Papa.parse<string[]>(csvText, {
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    console.error("[upload-base-action] erro no Papa.parse do servidor:", parsed.errors);
    return { success: false, error: "Erro ao analisar o CSV no servidor." };
  }

  const parsedRows = parsed.data.filter((row) =>
    row.some((cell) => cell !== ""),
  );

  const result = await uploadBaseToSheet(parsedRows, user.profile.fullName);

  if (result.success) {
    // 1. IMPORTAÇÃO NO BANCO DE DADOS DE RETENÇÃO (Fase 1 - Parte 2)
    // Feito de forma isolada e protegida por timeout (4s) para evitar que instabilidades no Supabase travem a Vercel
    try {
      const parseResult = parseBaseRetencao(csvText);
      
      console.info(
        `[upload-base-banco] parse concluído. Lidas: ${parseResult.lidas}, válidas: ${parseResult.validas}, puladas: ${parseResult.puladas}`,
      );

      if (parseResult.linhas.length > 0) {
        const dbPromise = salvarBaseRetencao(parseResult.linhas);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout de 4s excedido ao tentar salvar no banco de dados")), 4000)
        );
        
        const dbResult = await Promise.race([dbPromise, timeoutPromise]);
        
        if (dbResult.success) {
          console.info(
            `[upload-base-banco] persistência concluída com sucesso: ${dbResult.rowsWritten} linhas gravadas no Supabase.`,
          );
        } else {
          console.error(
            `[upload-base-banco] falha ao gravar no banco: ${dbResult.error}`,
          );
        }
      } else {
        console.warn("[upload-base-banco] aviso: nenhuma linha válida de retenção encontrada para gravação.");
      }
    } catch (dbErr) {
      console.error(
        "[upload-base-banco] erro inesperado no fluxo de salvamento do banco de dados (isolado):",
        dbErr,
      );
    }

    // 2. Snapshot da evolução da TX (complementar — falha silenciosa e com timeout de 2s não bloqueia upload).
    try {
      const consolidado = await fetchConsolidado();
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
        const savePromise = saveEvolucaoAction(tx * 100);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout de 2s excedido ao tentar salvar snapshot de evolução")), 2000)
        );

        const snapshotResult = await Promise.race([savePromise, timeoutPromise]);
        
        if (!snapshotResult.success) {
          console.error(
            "[upload-base] falha ao salvar snapshot evolução:",
            snapshotResult.error,
          );
        }
      }
    } catch (err) {
      console.error("[upload-base] erro ao processar snapshot (isolado):", err);
    }

    revalidatePath("/d-1");
  }

  return result;
}
