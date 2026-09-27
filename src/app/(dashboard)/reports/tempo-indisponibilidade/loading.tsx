// Suspense fallback do Next.js pra /reports/tempo-indisponibilidade —
// mostrado automaticamente enquanto o Server Component de page.tsx (async,
// aguarda getGestorTempoLogado + getGestorIndisponibilidade + outras 3
// chamadas em paralelo) ainda não resolveu. Mesmo padrão de
// /reports/consolidado, via o componente compartilhado KpiLoadingScreen,
// mas com formato próprio: anexo em largura total, tabela unificada e os
// quatro cards do resumo analítico nas mesmas posições da página real.
// Único mecanismo de loading desta rota (não soma com overlay manual).
import "./reports-tempo-indisp.css";
import { KpiLoadingScreen } from "@/components/gestor/kpi-loading-screen";

export default function LoadingReportsTempoIndisponibilidade() {
  return (
    <KpiLoadingScreen
      dataPage="reports-tempo-indisponibilidade"
      titulo="Tempo Logado & Indisponibilidade"
      formato="tempo-indisponibilidade"
      indicatorPosition="after-header"
    />
  );
}
