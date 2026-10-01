// Suspense fallback do Next.js pra /kpi/evolucao — mostrado automaticamente
// enquanto o Server Component de page.tsx (async, aguarda Promise.all de
// getRosterOperadoresGestor/getSnapshotsSummary) ainda não resolveu. Só
// dispara em NAVEGAÇÃO de rota (entrar na página, inclusive acesso
// direto/F5) — a seleção de operador é estado client dentro de
// AnaliseOperadoresSection, não passa por aqui.
import "./kpi-evolucao.css";
import { KpiLoadingScreen } from "@/components/gestor/kpi-loading-screen";

export default function LoadingKpiEvolucao() {
  return <KpiLoadingScreen dataPage="kpi-evolucao" titulo="Evolução" formato="kpi-evolucao" />;
}
