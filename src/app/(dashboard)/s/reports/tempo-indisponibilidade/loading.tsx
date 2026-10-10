// Suspense fallback do Next.js pra /s/reports/tempo-indisponibilidade —
// mostrado enquanto o Server Component de page.tsx (buscas em paralelo +
// piso mínimo de MIN_LOADING_MS) ainda não resolveu. O esqueleto espelha o
// layout real (ver tempo-indisp-skeleton.tsx), no mesmo formato do
// loading.tsx de /s/reports/consolidado.

import { cookies } from "next/headers";

import { COOKIE_LINHAS, TempoIndispSkeleton } from "./tempo-indisp-skeleton";
import { DESLIGAR_SCROLL_RESTORATION_SCRIPT } from "@/lib/scroll-restoration-script";

// Script de scroll do fallback (desliga a restauração nativa e força o
// topo antes do primeiro paint) — texto em src/lib/scroll-restoration-script.ts.
// A segunda camada (guarda em JS) é o useTopoAoCarregar.

export default async function LoadingReportsTempoIndisponibilidade() {
  // Nº de operadores da última tabela vista neste navegador (gravado por
  // TempoIndispSection) — esqueleto com a mesma altura da tabela real.
  const salvo = Number((await cookies()).get(COOKIE_LINHAS)?.value);
  const linhas = Number.isInteger(salvo) && salvo > 0 && salvo <= 200 ? salvo : undefined;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: DESLIGAR_SCROLL_RESTORATION_SCRIPT }} />
      <TempoIndispSkeleton linhas={linhas} />
    </>
  );
}
