// Suspense fallback do Next.js pra /kpi/operadores — mostrado automaticamente
// enquanto o Server Component de page.tsx (async, aguarda Promise.all de
// getRosterOperadoresGestor/getKpiDefinitions/getKpiEquipePorEmails/etc.)
// ainda não resolveu. Só dispara em NAVEGAÇÃO de rota (entrar na página,
// inclusive acesso direto/F5) — a troca de mês (Set/Ago/Jul) é estado
// client dentro de KpiEquipeSection (useState + server action via
// startTransition), não passa por aqui.
import "./kpi-operadores.css";
import { KpiLoadingScreen } from "@/components/gestor/kpi-loading-screen";

export default function LoadingKpiOperadores() {
  return <KpiLoadingScreen dataPage="kpi-operadores" titulo="Operadores" formato="tabela" />;
}
