// Suspense fallback do Next.js pra /configuracoes/equipe — mostrado
// automaticamente enquanto o Server Component de page.tsx (async, aguarda
// getEquipeAction) ainda não resolveu. Mesmo padrão de /kpi/operadores,
// /kpi/gestor, /kpi/detalhado-polo e /kpi/evolucao (fundo borrado, tema Zen
// Linen), via o mesmo componente compartilhado KpiLoadingScreen — mas com
// formato="equipe" e as props de layout (maxWidthClassName/showActionsRow)
// ajustadas pra bater com a estrutura real desta página (container
// max-w-2xl, sem a linha de ações que as páginas de KPI têm), evitando o
// salto de título/layout na troca do loading pra página carregada.
import "./configuracoes-equipe.css";
import { KpiLoadingScreen } from "@/components/gestor/kpi-loading-screen";

export default function LoadingConfiguracoesEquipe() {
  return (
    <KpiLoadingScreen
      dataPage="configuracoes-equipe"
      titulo="Equipe"
      formato="equipe"
      maxWidthClassName="max-w-2xl"
      showActionsRow={false}
    />
  );
}
