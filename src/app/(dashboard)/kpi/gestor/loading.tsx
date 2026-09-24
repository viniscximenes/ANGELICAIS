// Suspense fallback do Next.js pra /kpi/gestor — mostrado automaticamente
// enquanto o Server Component de page.tsx (async, aguarda Promise.all de
// getKpiGestorMetas/getMesesDisponiveisGestor/getKpiGestorProprio/
// getDefasadosGestorPorKpi) ainda não resolveu. Só dispara em NAVEGAÇÃO de
// rota (entrar na página, inclusive acesso direto/F5) — a troca de mês
// (Set/Ago/Jul) é estado client dentro de KpiGestorSection (useState +
// server action via startTransition), não passa por aqui.
import "./kpi-gestor.css";
import { KpiLoadingScreen } from "@/components/gestor/kpi-loading-screen";

export default function LoadingKpiGestor() {
  return <KpiLoadingScreen dataPage="kpi-gestor" titulo="Gestor" formato="cards" />;
}
