// Suspense fallback do Next.js pra /reports/consolidado — mostrado
// automaticamente enquanto o Server Component de page.tsx (async, aguarda
// getGestorConsolidado + outras 4 chamadas em paralelo) ainda não resolveu.
// Mesmo padrão de /kpi/operadores, /kpi/gestor, /kpi/detalhado-polo,
// /kpi/evolucao e /configuracoes/equipe (fundo borrado, tema Zen Linen), via
// o componente compartilhado KpiLoadingScreen — com formato="consolidado"
// (tabela da equipe + placeholder genérico da seção Analítico), único
// mecanismo de loading desta rota (não soma com nenhum overlay manual).
import "./reports-consolidado.css";
import { KpiLoadingScreen } from "@/components/gestor/kpi-loading-screen";

export default function LoadingReportsConsolidado() {
  return (
    <KpiLoadingScreen
      dataPage="reports-consolidado"
      titulo="Consolidado"
      formato="consolidado"
      indicatorPosition="after-header"
    />
  );
}
