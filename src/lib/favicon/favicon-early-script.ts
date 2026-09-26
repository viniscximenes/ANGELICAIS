/**
 * Fonte do script inline injetado no <head> via <Script strategy="beforeInteractive">
 * (ver root layout.tsx) — roda durante o parse do HTML, antes do bundle
 * React carregar/hidratar.
 *
 * Por que existe: o favicon animado de "carregando" (favicon-loading.ts) só
 * liga via JS de componentes React (useFaviconLoading / FaviconNavigationBridge),
 * que só rodam depois que o bundle carrega e hidrata. Num F5 no meio de uma
 * navegação/upload que já estava com a animação ativa, esse intervalo (spinner
 * NATIVO do navegador na aba, que nenhum site consegue controlar/suprimir —
 * é chrome do navegador, não conteúdo da página) some, mas o favicon segue
 * estático por mais um tempo até a hidratação religar a animação de verdade.
 *
 * Este script fecha boa parte desse intervalo: se a sessão diz que a
 * animação estava ativa (sessionStorage sobrevive a um F5, diferente do
 * contador em memória de favicon-loading.ts, que zera), troca o favicon
 * estático por um frame congelado (mesmas cores — bolinha verde + anel
 * branco) IMEDIATAMENTE ao ser parsed, sem esperar hidratação nenhuma. Só
 * um frame parado (não anima) — de propósito: nada de canvas/setInterval
 * aqui, só a troca de atributo mais barata possível, pra não atrasar nada.
 * Assim que o módulo favicon-loading.ts carrega (import síncrono, roda no
 * eval do próprio bundle — antes até do primeiro efeito React), ele recupera
 * o href original guardado no dataset e retoma a animação de verdade sem
 * salto perceptível.
 *
 * Guardas: tudo em try/catch — se sessionStorage estiver bloqueado
 * (navegação privada) ou não houver nenhum <link rel="icon"> ainda no DOM
 * nesse ponto do parse, o script simplesmente não faz nada (fail-safe,
 * nunca lança/quebra a página).
 */
export const FAVICON_EARLY_SCRIPT = `
(function () {
  try {
    if (sessionStorage.getItem("favicon-loading-active") !== "1") return;
    var svg =
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'>" +
      "<circle cx='158' cy='158' r='154' fill='%236DFF57'/>" +
      "<circle cx='264' cy='264' r='197' fill='none' stroke='%23FFFFFF' stroke-width='78' stroke-dasharray='850 400' stroke-linecap='round'/>" +
      "</svg>";
    var dataUrl = "data:image/svg+xml," + svg;
    var links = document.querySelectorAll('link[rel~="icon"]');
    for (var i = 0; i < links.length; i++) {
      var link = links[i];
      if (link.dataset.faviconOriginalHref === undefined) {
        link.dataset.faviconOriginalHref = link.href;
      }
      link.href = dataUrl;
    }
  } catch (e) {
    // silencioso — nunca deve quebrar o carregamento da página.
  }
})();
`;
