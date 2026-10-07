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
 * SCRIPT_TOPO_HASH: o script DESLIGAR_SCROLL_RESTORATION_SCRIPT dos
 * loading.tsx (idêntico em todos) é liberado pelo hash, não pelo nonce —
 * dois desses loading.tsx também são importados por componentes client
 * (CoordenadorSkeleton, DiarioSkeleton), onde next/headers não existe. Se o
 * texto desse script mudar, o hash muda junto: recalcular com
 *   node -e "console.log(require('crypto').createHash('sha256').update(SCRIPT).digest('base64'))"
 * senão o navegador bloqueia o script (só deixa de forçar o topo; nada quebra).
 *
 * Em dev o React precisa de 'unsafe-eval' (stack traces/HMR).
 *
 * As outras diretivas são as que já estavam em next.config.ts (fecham
 * clickjacking, <base>, <object>/<embed> e envio de formulário pra fora).
 */
const SCRIPT_TOPO_HASH = "'sha256-nxkLbxP4qRsmACURC+srXDL4+tc/hIWfGrkEkaQpahs='";

function montarCsp(nonce: string): string {
  const dev = process.env.NODE_ENV === "development";
  return [
    `script-src 'self' 'nonce-${nonce}' ${SCRIPT_TOPO_HASH} 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
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
