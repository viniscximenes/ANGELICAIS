import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { KpiEmptyState } from "@/components/kpi/atual-principal/kpi-empty-state";
import { KpiReorderableGrid } from "@/components/kpi/atual-principal/kpi-reorderable-grid";
import { KpiTabs } from "@/components/kpi/kpi-tabs";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getCurrentMonthSnapshot } from "@/lib/kpi/atual/get-current-month-snapshot";
import type { EnrichedKpiValue } from "@/lib/kpi/atual/types";
import type { NeutralKpiValue } from "@/lib/kpi/passado/types";
import { formatDateBR } from "@/lib/utils/format-datetime-br";

export const metadata: Metadata = {
  title: "KPI Atual — Principal — ALLOHA FIBRA",
};

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
    redirect("/reports/consolidado");
  }

  const snapshot = await getCurrentMonthSnapshot(user.profile.emailCorporativo);

  const monthLabel = formatMonthLabel(snapshot.mesRef);
  const dataCorteLabel = snapshot.dataCorte
    ? `dados até ${formatDateBR(snapshot.dataCorte)}`
    : null;

  // Converter o Map para objeto plano para passar para o Client Component
  const kpisObject: Record<string, EnrichedKpiValue | NeutralKpiValue> = {};
  snapshot.kpis.forEach((value, key) => {
    kpisObject[key] = value;
  });

  return (
    <PageTransition>
      <div className="px-6 py-8 lg:px-12 lg:py-12">
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
            <KpiReorderableGrid
              kpis={kpisObject}
              userEmail={user.profile.emailCorporativo}
            />
          )}
        </div>
      </div>
    </PageTransition>
  );
}
