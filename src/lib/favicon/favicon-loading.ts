/**
 * Favicon animado no modo "carregando" — adaptado do script de referência
 * (canvas + desenharIcone/criarFaviconAnimado), só o modo "carregando"
 * (os outros — órbita, pulso, aviso — não são usados neste projeto).
 *
 * Uso: sempre via `startFaviconLoading()`/`stopFaviconLoading()` (ou, em
 * componentes React, o hook `useFaviconLoading` em ./use-favicon-loading.ts)
 * — nunca direto. É um contador de referência: chamadas concorrentes (ex.
 * navegação + upload de base ao mesmo tempo) só param a animação quando a
 * ÚLTIMA delas parar. Singleton em nível de módulo — um só canvas/intervalo
 * pro site inteiro, independente de quantos componentes pedem a animação.
 *
 * SSR-safe: toda função é um no-op no servidor (`typeof window ===
 * "undefined"`) — nada de canvas/document é tocado fora do browser.
 */

const TAMANHO = 64;
const INTERVALO_MS = 80;
const VERDE = "#6DFF57";

let contador = 0;
let intervalId: ReturnType<typeof setInterval> | null = null;
let inicio = 0;
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
/** hrefs originais dos <link rel="icon"> encontrados no momento em que a animação começou — restaurados ao parar. */
let hrefsOriginais: { link: HTMLLinkElement; href: string }[] = [];

/**
 * Cor do anel: sempre branco, independente do tema do site (`data-theme`)
 * e do tema do navegador/SO (`prefers-color-scheme`) — pedido explícito,
 * só a bolinha verde (`VERDE`, acima) muda/permanece fixa por design.
 * Antes variava com `data-theme` (branco no escuro, um azul-escuro
 * #1F2430 no claro), o que deixava o anel escuro e pouco visível sobre o
 * favicon pequeno na aba do navegador no tema claro.
 */
function corDoAnel(): string {
  return "#FFFFFF";
}

/** Desenha um frame do modo "carregando" — mesma matemática do script de referência (x/y/r fixos nesse modo; só o arco do anel gira/estica). */
function desenharFrame(t: number) {
  if (!ctx) return;
  const k = TAMANHO / 512;
  ctx.clearRect(0, 0, TAMANHO, TAMANHO);
  ctx.save();
  ctx.scale(k, k);

  const x = 158;
  const y = 158;
  const r = 154;
  const giro = t * Math.PI * 2 * 0.9;
  const comprimento = Math.PI * (0.4 + 1.2 * (0.5 + 0.5 * Math.sin(t * Math.PI * 1.5)));
  const inicioArco = giro;
  const fimArco = giro + comprimento;

  ctx.fillStyle = VERDE;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = corDoAnel();
  ctx.lineWidth = 78;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(264, 264, 197, inicioArco, fimArco);
  ctx.stroke();

  ctx.restore();
}

/** Todos os <link rel="icon"> da página (Next pode gerar mais de um, ex. tamanhos diferentes de app/icon.png). */
function linksDeIcone(): HTMLLinkElement[] {
  return Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'));
}

/**
 * Chave usada pra persistir "a animação está ativa" entre reloads (ver
 * FAVICON_EARLY_ORIGINAL_ATTR e o script inline de favicon-early-script.ts).
 * sessionStorage sobrevive a um F5 (diferente do contador em memória, que
 * zera) — é assim que o script inline no <head> sabe, ainda durante o parse
 * do HTML (antes do bundle React carregar/hidratar), que deve mostrar
 * nosso favicon "carregando" em vez de deixar o navegador com o favicon
 * estático padrão até a hidratação ligar esta animação de novo.
 */
const SESSION_KEY = "favicon-loading-active";

/** data-attribute que o script inline usa pra guardar o href ORIGINAL do
 * <link rel="icon"> antes de sobrescrevê-lo com o frame estático — pra essa
 * função aqui conseguir restaurar o valor certo depois, mesmo quando o
 * script inline já rodou primeiro (senão hrefsOriginais capturaria o data
 * URI do frame estático como se fosse o "original"). */
const FAVICON_EARLY_ORIGINAL_ATTR = "faviconOriginalHref";

function marcarSessao(ativo: boolean) {
  try {
    if (ativo) sessionStorage.setItem(SESSION_KEY, "1");
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // sessionStorage pode lançar em modo privado/bloqueado — não é crítico,
    // só perde a continuidade entre reloads, a animação client-side normal
    // continua funcionando.
  }
}

function iniciarAnimacao() {
  if (typeof window === "undefined") return;
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.width = TAMANHO;
    canvas.height = TAMANHO;
    ctx = canvas.getContext("2d");
  }
  const links = linksDeIcone();
  if (links.length === 0) return; // sem <link rel="icon"> na página — nada a animar

  hrefsOriginais = links.map((link) => {
    // Se o script inline (favicon-early-script.ts) já rodou antes deste
    // módulo carregar, o href atual do link é o frame estático dele, não o
    // favicon de verdade — o original de verdade está guardado no dataset.
    const original = link.dataset[FAVICON_EARLY_ORIGINAL_ATTR];
    if (original !== undefined) delete link.dataset[FAVICON_EARLY_ORIGINAL_ATTR];
    return { link, href: original ?? link.href };
  });
  inicio = performance.now();
  marcarSessao(true);

  intervalId = setInterval(() => {
    const t = (performance.now() - inicio) / 1000;
    desenharFrame(t);
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    for (const { link } of hrefsOriginais) {
      link.href = dataUrl;
    }
  }, INTERVALO_MS);
}

function pararAnimacao() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
  for (const { link, href } of hrefsOriginais) {
    link.href = href;
  }
  hrefsOriginais = [];
  marcarSessao(false);
}

/** Pede a animação de "carregando" — incrementa o contador; só (re)inicia o desenho se estava parado (0 → 1). */
export function startFaviconLoading() {
  if (typeof window === "undefined") return;
  contador += 1;
  if (contador === 1) iniciarAnimacao();
}

/** Libera um pedido — decrementa o contador; só restaura o favicon original quando o ÚLTIMO pedido pendente termina (1 → 0). Chamar em par com startFaviconLoading, sempre (inclusive em erro — ver useFaviconLoading). */
export function stopFaviconLoading() {
  if (typeof window === "undefined") return;
  contador = Math.max(0, contador - 1);
  if (contador === 0) pararAnimacao();
}
