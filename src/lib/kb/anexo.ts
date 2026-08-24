import { createAdminClient } from "@/lib/supabase/admin";
import { detectarAnexoTipo, validarAnexo } from "./anexo-validacao";
import type { KbAnexoTipo } from "./types";

export const KB_ANEXO_BUCKET = "kb-anexos";

// URL assinada válida por 24h — regenerada a cada leitura (listagem da
// página de admin, ou montagem da citação no /api/chat), nunca persistida.
const URL_ASSINADA_EXPIRACAO_SEGUNDOS = 60 * 60 * 24;

/**
 * Gera uma URL assinada temporária para um caminho de objeto no bucket
 * privado kb-anexos. Retorna null se o path for vazio ou se a assinatura
 * falhar (ex: objeto removido do Storage por fora do fluxo normal).
 */
export async function getAnexoUrlAssinada(
  path: string | null | undefined,
): Promise<string | null> {
  if (!path) return null;

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(KB_ANEXO_BUCKET)
    .createSignedUrl(path, URL_ASSINADA_EXPIRACAO_SEGUNDOS);

  if (error || !data) {
    console.error("[anexo] erro ao gerar URL assinada:", error);
    return null;
  }
  return data.signedUrl;
}

/**
 * Faz upload do anexo para o Storage e devolve os metadados a gravar em
 * kb_artigos. Lança erro se a validação ou o upload falharem.
 */
export async function uploadAnexo(
  file: File,
): Promise<{ path: string; tipo: KbAnexoTipo; nome: string }> {
  const validacao = validarAnexo(file);
  if (!validacao.valido) {
    throw new Error(validacao.erro);
  }
  const tipo = detectarAnexoTipo(file.name)!;
  const path = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(KB_ANEXO_BUCKET)
    .upload(path, file, { contentType: file.type || undefined });

  if (error) {
    console.error("[anexo] erro ao fazer upload:", error);
    throw new Error("Erro ao enviar arquivo");
  }

  return { path, tipo, nome: file.name };
}

/** Remove um objeto do bucket kb-anexos. Falha silenciosamente (loga só). */
export async function removerAnexo(path: string | null | undefined): Promise<void> {
  if (!path) return;
  const admin = createAdminClient();
  const { error } = await admin.storage.from(KB_ANEXO_BUCKET).remove([path]);
  if (error) {
    console.error("[anexo] erro ao remover arquivo antigo:", error);
  }
}
