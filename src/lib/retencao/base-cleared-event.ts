/**
 * Sinal cross-tree pra avisar o bloco Analítico (RetencaoDetalheSection) que
 * `retencao_atendimentos` mudou — hoje disparado em dois pontos: "Limpar
 * Base" (ClearBaseButton, dentro de GestorEquipeSection) e upload de uma
 * base nova (UploadDropzone), já que uploadConsolidadoAction grava tanto
 * `retencao_atendimentos` quanto `d1_consolidado` na mesma chamada.
 *
 * As duas árvores são decoupled de propósito (d1_consolidado é a fonte
 * principal/viva, carregada de cara; retencao_atendimentos é detalhe sob
 * demanda, buscado uma vez após o mount) — não há estado React compartilhado
 * entre elas. `revalidatePath` (chamado nas Server Actions de upload/clear)
 * só invalida o cache de Server Components — não afeta um fetch client-side
 * feito manualmente via Server Action dentro de um useEffect, que só roda de
 * novo se alguém disparar isso explicitamente. Um evento simples de `window`
 * evita ter que introduzir Context/lift de estado só pra essa sincronização.
 */
const BASE_ATUALIZADA_EVENT = "retencao-base-atualizada";

export function notifyBaseAtualizada(): void {
  window.dispatchEvent(new Event(BASE_ATUALIZADA_EVENT));
}

export function onBaseAtualizada(callback: () => void): () => void {
  window.addEventListener(BASE_ATUALIZADA_EVENT, callback);
  return () => window.removeEventListener(BASE_ATUALIZADA_EVENT, callback);
}
