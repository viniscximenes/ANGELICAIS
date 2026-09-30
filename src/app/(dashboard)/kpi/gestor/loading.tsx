// Suspense fallback do Next.js pra /kpi/gestor — mostrado automaticamente
// enquanto o Server Component de page.tsx (async, aguarda as buscas + o piso
// mínimo de MIN_LOADING_MS — ver page.tsx) ainda não resolveu. Só dispara em
// NAVEGAÇÃO de rota (entrar na página, inclusive acesso direto/F5) — a troca
// de mês é estado client dentro de KpiGestorSection (skeleton próprio dos
// cards), não passa por aqui.
//
// Tela própria (KpiGestorLoadingScreen), espelhando a posição exata do
// cabeçalho, da linha de ações e dos cards — mesma abordagem do loading.tsx
// de /s/reports/consolidado.
import { Instrument_Sans } from "next/font/google";

import "./kpi-gestor.css";
import { KpiGestorLoadingScreen } from "@/components/gestor/kpi-gestor/kpi-gestor-loading-screen";

// MESMA fonte/variável de page.tsx — loading.tsx monta antes de page.tsx
// resolver, então precisa importar de novo.
const zenSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--font-zen-sans",
});

// Script inline, síncrono — mesma correção de /s/reports/consolidado (e
// /kpi/operadores): roda no PARSE do HTML deste fallback, antes de qualquer
// hidratação, desligando a restauração nativa de scroll e forçando o topo
// antes do primeiro paint. A segunda camada (guarda por frames) fica no
// useLayoutEffect de KpiGestorSection.
const DESLIGAR_SCROLL_RESTORATION_SCRIPT = `
try {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
} catch (e) {}
`;

export default function LoadingKpiGestor() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: DESLIGAR_SCROLL_RESTORATION_SCRIPT }} />
      <KpiGestorLoadingScreen fontClassName={zenSans.variable} />
    </>
  );
}
