/**
 * Sinal cross-tree pra avisar o bloco Analítico (RetencaoDetalheSection) que
 * `retencao_atendimentos` mudou. Hoje é disparado só por GestorEquipeSection,
 * em dois pontos: no polling, quando a versão da base muda (outro gestor
 * subiu ou limpou a base), e ao concluir o "Limpar Base" (handleBaseCleared),
 * se o refetch ainda não tiver avisado. O upload feito nesta aba não dispara o
 * evento: o UploadDropzone recarrega a página inteira e o Analítico busca a
 * base nova no mount.
 *
 * Também usado em /s/reports/tma-peso: GestorTmaSection dispara quando a
 * versão da base do TMA muda (polling, "Limpar Base" ou meta salva) e
 * AnaliticoTmaSection recarrega. Cada página só monta o próprio Analítico,
 * então os dois usos não se cruzam.
 *
 * As duas árvores são decoupled de propósito (d1_consolidado é a fonte
 * principal/viva, carregada de cara; retencao_atendimentos é detalhe sob
 * demanda, buscado uma vez após o mount) — não há estado React compartilhado
 * entre elas, e as actions de upload/limpeza não chamam revalidatePath (que
 * de qualquer forma não refaria um fetch client-side feito via Server Action
 * dentro de um useEffect). Um evento simples de `window` evita ter que
 * introduzir Context/lift de estado só pra essa sincronização.
 */
const BASE_ATUALIZADA_EVENT = "retencao-base-atualizada";

export function notifyBaseAtualizada(): void {
  window.dispatchEvent(new Event(BASE_ATUALIZADA_EVENT));
}

export function onBaseAtualizada(callback: () => void): () => void {
  window.addEventListener(BASE_ATUALIZADA_EVENT, callback);
  return () => window.removeEventListener(BASE_ATUALIZADA_EVENT, callback);
}
