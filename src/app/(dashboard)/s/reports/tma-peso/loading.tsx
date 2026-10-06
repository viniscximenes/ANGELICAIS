// Suspense fallback do Next.js pra /s/reports/tma-peso — mostrado enquanto
// o Server Component de page.tsx (buscas em paralelo + piso mínimo de
// MIN_LOADING_MS) ainda não resolveu. O esqueleto espelha o layout real
// (ver tma-peso-skeleton.tsx), no mesmo formato do loading.tsx de
// /s/reports/consolidado.

import { cookies } from "next/headers";

import { COOKIE_LINHAS, TmaPesoSkeleton } from "./tma-peso-skeleton";

// Script inline, síncrono — roda no PARSE do HTML deste fallback, antes de
// qualquer hidratação. A guarda em JS (useTopoAoCarregar) só age depois que
// o bundle carrega; nesse intervalo o navegador já pode ter restaurado e
// PINTADO a posição de scroll salva. Este script fecha essa janela,
// desligando a restauração nativa e forçando o topo antes do primeiro paint.
const DESLIGAR_SCROLL_RESTORATION_SCRIPT = `
try {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
} catch (e) {}
`;

export default async function LoadingReportsTmaPeso() {
  // Nº de operadores da última tabela vista neste navegador (gravado por
  // GestorTmaSection) — esqueleto com a mesma altura da tabela real.
  const salvo = Number((await cookies()).get(COOKIE_LINHAS)?.value);
  const linhas = Number.isInteger(salvo) && salvo > 0 && salvo <= 200 ? salvo : undefined;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: DESLIGAR_SCROLL_RESTORATION_SCRIPT }} />
      <TmaPesoSkeleton linhas={linhas} />
    </>
  );
}
