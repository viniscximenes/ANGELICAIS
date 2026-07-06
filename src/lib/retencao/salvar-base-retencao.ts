import { createAdminClient } from "@/lib/supabase/admin";
import type { RetencaoAtendimentoInput } from "./parse-base-retencao";

export type SaveResult = {
  success: boolean;
  rowsWritten: number;
  error?: string;
};

/**
 * Persiste os atendimentos de retenção no banco usando a Abordagem de Sobrescrita Segura.
 * 
 * Estratégia de segurança:
 * 1. Definimos um timestamp único para o lote atual (importadoEm).
 * 2. Inserimos os novos registros em lotes/chunks (tamanho: 500).
 * 3. Em caso de qualquer erro de escrita na inserção do lote novo, executamos a limpeza
 *    imediata das linhas inseridas com o timestamp atual falho, de forma a não corromper
 *    e preservar as linhas do lote anterior.
 * 4. Somente se TODAS as inserções tiverem sucesso absoluto, executamos a deleção de
 *    todas as linhas com timestamps anteriores ao do lote atual.
 */
export async function salvarBaseRetencao(
  linhas: RetencaoAtendimentoInput[],
): Promise<SaveResult> {
  if (linhas.length === 0) {
    return { success: true, rowsWritten: 0 };
  }

  const supabase = createAdminClient();
  const importadoEm = new Date().toISOString();
  const CHUNK_SIZE = 500;

  // Adiciona a coluna de marcação de lote
  const payload = linhas.map((row) => ({
    ...row,
    importado_em: importadoEm,
  }));

  try {
    // 1. Inserção em chunks de 500
    for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
      const chunk = payload.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase.from("retencao_atendimentos").insert(chunk);
      
      if (error) {
        throw new Error(error.message);
      }
    }

    // 2. Com todas as inserções bem-sucedidas, removemos os registros do lote anterior
    const { error: deleteError } = await supabase
      .from("retencao_atendimentos")
      .delete()
      .lt("importado_em", importadoEm);

    if (deleteError) {
      console.warn(
        "[salvar-base-retencao] aviso ao remover lote antigo (limpeza prosseguiu):",
        deleteError.message,
      );
    }

    return {
      success: true,
      rowsWritten: payload.length,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[salvar-base-retencao] erro crítico detectado na inserção:", errMsg);

    // Rollback: remove as inserções parciais que foram feitas nesse lote falho
    try {
      await supabase
        .from("retencao_atendimentos")
        .delete()
        .eq("importado_em", importadoEm);
      console.info("[salvar-base-retencao] rollback efetuado com sucesso (lote parcial deletado)");
    } catch (rollbackErr) {
      console.error(
        "[salvar-base-retencao] erro grave ao tentar efetuar rollback:",
        rollbackErr,
      );
    }

    return {
      success: false,
      rowsWritten: 0,
      error: errMsg,
    };
  }
}
