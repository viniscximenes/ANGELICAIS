// Suspense fallback do Next.js pra /reports/tempo-indisponibilidade —
// mostrado automaticamente enquanto o Server Component de page.tsx (async,
// aguarda getGestorTempoLogado + getGestorIndisponibilidade + outras 3
// chamadas em paralelo) ainda não resolveu. Mesmo padrão de
// /reports/consolidado, via o componente compartilhado KpiLoadingScreen —
// com formato="consolidado" (tabela da equipe + placeholder genérico da
// seção Analítico), reaproveitado tal como está: a estrutura desta rota
// (tabela unificada + trilho horizontal com cards analíticos) é equivalente
// à do consolidado, então o mesmo esqueleto genérico já serve sem precisar
// de um formato dedicado. Único mecanismo de loading desta rota (não soma
// com nenhum overlay manual).
import "./reports-tempo-indisp.css";
import { KpiLoadingScreen } from "@/components/gestor/kpi-loading-screen";

export default function LoadingReportsTempoIndisponibilidade() {
  return (
    <KpiLoadingScreen
      dataPage="reports-tempo-indisponibilidade"
      titulo="Tempo Logado & Indisponibilidade"
      formato="consolidado"
    />
  );
}
