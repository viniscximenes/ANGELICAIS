/**
 * Sinal cross-tree pra pedir navegação até um card específico do trilho
 * horizontal (RetencaoHorizontalScroll) a partir de fora dela — ex: a
 * sidebar de navegação de /s/reports/consolidado (árvore irmã).
 *
 * Mesmo padrão de base-cleared-event.ts: as árvores continuam decoupled
 * (sem Context/lift de estado), só um evento de `window` carregando o
 * índice do card alvo. Quem sabe transformar esse índice em posição real
 * de scroll (via o ScrollTrigger e o snap já calibrados) é o próprio
 * RetencaoHorizontalScroll — este arquivo só transporta o pedido, não
 * duplica nenhum cálculo de scroll/pin.
 */
const SCROLL_TO_CARD_EVENT = "retencao-scroll-to-card";

export function requestScrollToCard(cardIndex: number): void {
  window.dispatchEvent(new CustomEvent<number>(SCROLL_TO_CARD_EVENT, { detail: cardIndex }));
}

export function onScrollToCardRequest(callback: (cardIndex: number) => void): () => void {
  const handler = (event: Event) => {
    callback((event as CustomEvent<number>).detail);
  };
  window.addEventListener(SCROLL_TO_CARD_EVENT, handler);
  return () => window.removeEventListener(SCROLL_TO_CARD_EVENT, handler);
}

/**
 * Sinal do sentido contrário: o bloco Analítico avisa se o trilho (os
 * cards #trilho-card-N) existe agora. Enquanto carrega, está vazio ou deu
 * erro, não há card pra onde rolar — a sidebar mostra esses itens apagados
 * e sem clique, em vez de itens que não fazem nada.
 */
const TRILHO_DISPONIVEL_EVENT = "retencao-trilho-disponivel";

export function notifyTrilhoDisponivel(disponivel: boolean): void {
  window.dispatchEvent(new CustomEvent<boolean>(TRILHO_DISPONIVEL_EVENT, { detail: disponivel }));
}

export function onTrilhoDisponivel(callback: (disponivel: boolean) => void): () => void {
  const handler = (event: Event) => {
    callback((event as CustomEvent<boolean>).detail);
  };
  window.addEventListener(TRILHO_DISPONIVEL_EVENT, handler);
  return () => window.removeEventListener(TRILHO_DISPONIVEL_EVENT, handler);
}
