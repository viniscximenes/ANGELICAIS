// Suspense fallback do Next.js pra /reports/tempo-indisponibilidade —
// mostrado automaticamente enquanto o Server Component de page.tsx (async,
// aguarda getGestorTempoLogado + getGestorIndisponibilidade + outras 3
// chamadas em paralelo, mais o piso mínimo de 3s de page.tsx) ainda não
// resolveu. O mesmo formato também é usado no overlay do refresh manual.
// O esqueleto próprio replica cabeçalho, controles, anexo, tabela e o
// primeiro bloco analítico nas posições atuais da página real.
import "./reports-tempo-indisp.css";
import { KpiLoadingScreen } from "@/components/gestor/kpi-loading-screen";

// Script inline, síncrono — roda no PARSE do HTML deste fallback, antes de
// qualquer hidratação React. A guarda em JS (useLayoutEffect, ver
// TempoIndispSection) só age DEPOIS que o bundle carrega e o componente
// monta; nesse intervalo (streaming deste loading.tsx + piso mínimo de 3s
// em page.tsx), o navegador já pode ter restaurado e PINTADO a posição de
// scroll salva (ex.: fim da página) — daí um "pisca" possível: um frame na
// posição antiga, só depois corrigido pra topo. Este script fecha essa
// janela, desligando a restauração nativa e forçando o topo o mais cedo
// possível (antes do primeiro paint do documento). Mesma correção
// replicada em /reports/consolidado e /reports/tma-peso.
const DESLIGAR_SCROLL_RESTORATION_SCRIPT = `
try {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
} catch (e) {}
`;

export default function LoadingReportsTempoIndisponibilidade() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: DESLIGAR_SCROLL_RESTORATION_SCRIPT }} />
      <KpiLoadingScreen
        dataPage="reports-tempo-indisponibilidade"
        titulo="Tempo Logado & Indisponibilidade"
        formato="tempo-indisponibilidade"
        indicatorPosition="after-header"
        spinnerVariant="dots"
      />
    </>
  );
}
