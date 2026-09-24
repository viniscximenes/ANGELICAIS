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
 * Cor do anel: o script de referência usa `prefers-color-scheme` (tema do
 * SISTEMA operacional). Este projeto controla o tema por `data-theme` no
 * <html> (o usuário escolhe no app, independente do SO — ver
 * theme-provider.tsx) — usar `prefers-color-scheme` faria o favicon
 * dessincronizar do tema real da página sempre que o usuário escolhesse um
 * tema diferente do SO. Por isso a cor do anel aqui lê `data-theme`, não
 * `matchMedia`. Lido a cada frame (não só na hora de iniciar), então uma
 * troca de tema durante uma animação em andamento já reflete no próximo
 * redesenho, sem precisar reiniciar o favicon.
 */
function corDoAnel(): string {
  if (typeof document === "undefined") return "#FFFFFF";
  const tema = document.documentElement.getAttribute("data-theme");
  return tema === "light" ? "#1F2430" : "#FFFFFF";
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

  hrefsOriginais = links.map((link) => ({ link, href: link.href }));
  inicio = performance.now();

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
