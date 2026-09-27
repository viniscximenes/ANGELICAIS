// Suspense fallback do Next.js pra /reports/tempo-indisponibilidade —
// mostrado automaticamente enquanto o Server Component de page.tsx (async,
// aguarda getGestorTempoLogado + getGestorIndisponibilidade + outras 3
// chamadas em paralelo, mais o piso mínimo de 3s de page.tsx) ainda não
// resolveu. O mesmo formato também é usado no overlay do refresh manual.
// O esqueleto próprio replica cabeçalho, controles, anexo, tabela e o
// primeiro bloco analítico nas posições atuais da página real.
import "./reports-tempo-indisp.css";
import { KpiLoadingScreen } from "@/components/gestor/kpi-loading-screen";

export default function LoadingReportsTempoIndisponibilidade() {
  return (
    <KpiLoadingScreen
      dataPage="reports-tempo-indisponibilidade"
      titulo="Tempo Logado & Indisponibilidade"
      formato="tempo-indisponibilidade"
      indicatorPosition="after-header"
      spinnerVariant="dots"
    />
  );
}
