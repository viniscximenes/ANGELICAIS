import { createAdminClient } from "@/lib/supabase/admin";
import type { PausaCsvRow } from "./parse-csv-pausas";

export type SalvarCsvPausasResult = {
  success: boolean;
  rowsWritten: number;
  error?: string;
};

const CHUNK_SIZE = 500;

/**
 * Persiste as linhas do CSV em db_pausas_diario, por dia (data_ref), usando
 * a mesma Abordagem de Sobrescrita Segura de salvarBaseRetencao: insere o
 * lote novo marcado com um importado_em único e só remove o lote antigo
 * DAQUELE MESMO data_ref depois que a inserção nova é confirmada — o dia
 * nunca fica vazio no meio do caminho. Dias diferentes coexistem.
 */
export async function salvarCsvPausas(
  linhas: PausaCsvRow[],
): Promise<SalvarCsvPausasResult> {
  if (linhas.length === 0) {
    return { success: true, rowsWritten: 0 };
  }

  const porDia = new Map<string, PausaCsvRow[]>();
  for (const linha of linhas) {
    const grupo = porDia.get(linha.data_ref);
    if (grupo) {
      grupo.push(linha);
    } else {
      porDia.set(linha.data_ref, [linha]);
    }
  }

  const supabase = createAdminClient();
  let rowsWritten = 0;

  for (const [dataRef, linhasDoDia] of porDia) {
    const importadoEm = new Date().toISOString();
    const payload = linhasDoDia.map((row) => ({
      ...row,
      importado_em: importadoEm,
    }));

    try {
      for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
        const chunk = payload.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase.from("db_pausas_diario").insert(chunk);
        if (error) {
          throw new Error(error.message);
        }
      }

      const { error: deleteError } = await supabase
        .from("db_pausas_diario")
        .delete()
        .eq("data_ref", dataRef)
        .lt("importado_em", importadoEm);

      if (deleteError) {
        console.warn(
          `[salvar-csv-pausas] aviso ao remover lote antigo de ${dataRef} (limpeza prosseguiu):`,
          deleteError.message,
        );
      }

      rowsWritten += payload.length;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(
        `[salvar-csv-pausas] erro crítico ao salvar o dia ${dataRef}:`,
        errMsg,
      );

      try {
        await supabase
          .from("db_pausas_diario")
          .delete()
          .eq("data_ref", dataRef)
          .eq("importado_em", importadoEm);
        console.info(
          `[salvar-csv-pausas] rollback efetuado para ${dataRef} (lote parcial removido)`,
        );
      } catch (rollbackErr) {
        console.error("[salvar-csv-pausas] erro grave no rollback:", rollbackErr);
      }

      return { success: false, rowsWritten, error: errMsg };
    }
  }

  return { success: true, rowsWritten };
}
