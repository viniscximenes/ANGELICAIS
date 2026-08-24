import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { KpiEmptyState } from "@/components/kpi/atual-principal/kpi-empty-state";
import { KpiMediumCard } from "@/components/kpi/atual-principal/kpi-medium-card";
import { KpiPassadoTabs } from "@/components/kpi/kpi-passado-tabs";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getPreviousMonthSecundario } from "@/lib/kpi/passado/get-previous-month-secundario";
import { formatDateBR } from "@/lib/utils/format-datetime-br";

export const metadata: Metadata = {
  title: "KPI - Passado Secundário",
};

const SECUNDARIO_ORDER = [
  "tx_retencao_liquida_15d",
  "atendidas",
  "transfer",
  "short_call",
  "rechamada_d7",
  "csat",
  "nr17",
  "pessoal",
  "outras_pausas",
];

function formatMonthLabel(mesRef: string): string {
  const [year, month] = mesRef.split("-");
  const meses = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  return `${meses[parseInt(month) - 1]} ${year}`;
}

export default async function KpiPassadoSecundarioPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.profile.role === "GESTOR") {
    redirect("/reports/consolidado");
  }

  const snapshot = await getPreviousMonthSecundario(
    user.profile.emailCorporativo,
  );

  const monthLabel = formatMonthLabel(snapshot.mesRef);
  const dataCorteLabel = snapshot.dataCorte
    ? `dados até ${formatDateBR(snapshot.dataCorte)}`
    : null;

  let emptyStateTitle: string | undefined;
  let emptyStateDescription: string | undefined;

  if (!snapshot.hasAnyDataInBank) {
    emptyStateTitle = "Ainda não há mês passado para consultar";
    emptyStateDescription = "Volte aqui após o fechamento do mês atual.";
  } else if (!snapshot.hasData) {
    emptyStateTitle = "Sem dados do mês passado";
    emptyStateDescription = `Não há registro de KPI para ${monthLabel} no seu histórico.`;
  }

  return (
    <PageTransition>
      <div className="px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="space-y-2">
            <div className="flex items-baseline gap-3">
              <h1 className="ds-h1">KPI</h1>
              <span className="ds-mono text-muted-foreground">
                / passado · secundário
              </span>
            </div>
            <p className="ds-mono-sm text-muted-foreground">
              {monthLabel}
              {dataCorteLabel && ` • ${dataCorteLabel}`}
            </p>
          </div>

          <KpiPassadoTabs />

          {!snapshot.hasData ? (
            <KpiEmptyState
              title={emptyStateTitle}
              description={emptyStateDescription}
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {SECUNDARIO_ORDER.map((slug, idx) => {
                const kpi = snapshot.kpis.get(slug);
                if (!kpi) return null;
                return (
                  <KpiMediumCard
                    key={slug}
                    kpi={kpi}
                    delayIndex={idx}
                    neutral
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
