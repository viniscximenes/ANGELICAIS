// Suspense fallback do Next.js pra /kpi/detalhado-polo — mostrado
// automaticamente enquanto o Server Component de page.tsx (async, aguarda
// getKpiDetalhado) ainda não resolveu. Só dispara em NAVEGAÇÃO de rota
// (entrar na página, inclusive acesso direto/F5).
import "./kpi-detalhado-polo.css";
import { KpiLoadingScreen } from "@/components/gestor/kpi-loading-screen";

export default function LoadingKpiDetalhadoPolo() {
  return (
    <KpiLoadingScreen
      dataPage="kpi-detalhado-polo"
      titulo="Detalhado Polo"
      formato="kpi-detalhado-polo"
    />
  );
}
