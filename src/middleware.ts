import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Content-Security-Policy com nonce por request.
 *
 * script-src: só roda script com o nonce desta resposta (ou carregado por
 * um script que já tinha o nonce — 'strict-dynamic'). É a segunda barreira
 * contra XSS: mesmo que algum texto vindo do banco/CSV vire HTML por engano,
 * um <script> injetado não executa. O Next aplica o nonce sozinho nos
 * scripts dele quando encontra esta CSP nos headers do request; os dois
 * inline do root layout leem `x-nonce` via headers().
 *
 * SCRIPT_TOPO_HASH: o script DESLIGAR_SCROLL_RESTORATION_SCRIPT
 * (src/lib/scroll-restoration-script.ts, importado pelos loading.tsx) é
 * liberado pelo hash, não pelo nonce —
 * dois desses loading.tsx também são importados por componentes client
 * (CoordenadorSkeleton, DiarioSkeleton), onde next/headers não existe. Se o
 * texto desse script mudar, o hash muda junto: recalcular com
 *   node -e "console.log(require('crypto').createHash('sha256').update(SCRIPT).digest('base64'))"
 * senão o navegador bloqueia o script (só deixa de forçar o topo; nada quebra).
 *
 * Em dev o React precisa de 'unsafe-eval' (stack traces/HMR).
 *
 * Demais recursos: default-src 'self' fecha tudo que não tem diretiva
 * própria. O navegador não fala com nenhum host externo — o Supabase só é
 * chamado no servidor (não existe createBrowserClient no projeto) e a Inter
 * vem de next/font, servida pelo próprio domínio:
 * - img-src data:/blob: — PNG do "Copiar imagem" (modern-screenshot monta
 *   o SVG/PNG como data: URL) e o <img> do HTML copiado.
 * - font-src data: — fontes embutidas pela captura do modern-screenshot.
 * - connect-src 'self' — Server Actions, RSC e o fetch de fontes da
 *   captura; em dev, ws: pro HMR.
 * - worker-src blob: — o Papa.parse({ worker: true }) do upload do TMA
 *   cria o Worker a partir de um Blob.
 *
 * RISCO-ACEITO: style-src permite 'unsafe-inline' (CSS injetado por XSS seria aplicado).
 * Motivo: o app depende de style inline em todo lugar (atributos style do React, <style> do FonteInter, motion/GSAP, Recharts); nonce não cobre atributos style.
 * Mitigação: script-src continua estrito (nonce + strict-dynamic), então CSS injetado não executa código; img-src/connect-src 'self' limitam exfiltração por url().
 * Revisar quando: os estilos dinâmicos migrarem pra classes/CSS variables e o FonteInter receber o nonce.
 *
 * As diretivas de fechamento (clickjacking, <base>, <object>/<embed> e envio
 * de formulário pra fora) são as que já estavam em next.config.ts.
 */
const SCRIPT_TOPO_HASH = "'sha256-nxkLbxP4qRsmACURC+srXDL4+tc/hIWfGrkEkaQpahs='";

function montarCsp(nonce: string): string {
  const dev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' ${SCRIPT_TOPO_HASH} 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${dev ? " ws:" : ""}`,
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
    "form-action 'self'",
  ].join("; ");
}

export async function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = montarCsp(nonce);

  // No request: o Next lê a CSP daqui pra aplicar o nonce nos scripts dele,
  // e as páginas leem `x-nonce` pros scripts inline próprios.
  request.headers.set("x-nonce", nonce);
  request.headers.set("Content-Security-Policy", csp);

  const response = await updateSession(request);
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
