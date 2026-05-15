import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { KpiEmptyState } from "@/components/kpi/atual-principal/kpi-empty-state";
import { KpiMediumCard } from "@/components/kpi/atual-principal/kpi-medium-card";
import { TxRetencaoHeroCard } from "@/components/kpi/atual-principal/tx-retencao-hero-card";
import { KpiTabs } from "@/components/kpi/kpi-tabs";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getCurrentMonthSnapshot } from "@/lib/kpi/atual/get-current-month-snapshot";
import { formatDateBR } from "@/lib/utils/format-datetime-br";

export const metadata: Metadata = {
  title: "KPI Atual — Principal — ANGELICAIS",
};

const MEDIUM_CARDS_ORDER = [
  "indisp_total",
  "tma",
  "abs",
  "pedidos",
  "churn",
  "variacao_ticket",
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

export default async function KpiAtualPrincipalPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.profile.role === "GESTOR") {
    redirect("/gestor/d-1");
  }

  const snapshot = await getCurrentMonthSnapshot(user.profile.emailCorporativo);

  const monthLabel = formatMonthLabel(snapshot.mesRef);
  const dataCorteLabel = snapshot.dataCorte
    ? `dados até ${formatDateBR(snapshot.dataCorte)}`
    : null;

  const txRetencao = snapshot.kpis.get("tx_retencao_bruta");

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="space-y-2">
            <div className="flex items-baseline gap-3">
              <h1 className="ds-h1">KPI</h1>
              <span className="ds-mono text-muted-foreground">
                / atual · principal
              </span>
            </div>
            <p className="ds-mono-sm text-muted-foreground">
              {monthLabel}
              {dataCorteLabel && ` • ${dataCorteLabel}`}
            </p>
          </div>

          <KpiTabs />

          {!snapshot.hasData ? (
            <KpiEmptyState />
          ) : (
            <div className="space-y-6">
              {txRetencao && <TxRetencaoHeroCard kpi={txRetencao} />}

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {MEDIUM_CARDS_ORDER.map((slug, idx) => {
                  const kpi = snapshot.kpis.get(slug);
                  if (!kpi) return null;
                  return (
                    <KpiMediumCard key={slug} kpi={kpi} delayIndex={idx} />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
