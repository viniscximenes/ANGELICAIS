import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { KpiEmptyState } from "@/components/kpi/atual-principal/kpi-empty-state";
import { KpiMediumCard } from "@/components/kpi/atual-principal/kpi-medium-card";
import { KpiTabs } from "@/components/kpi/kpi-tabs";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getCurrentMonthSecundario } from "@/lib/kpi/atual/get-current-month-secundario";
import { formatDateBR } from "@/lib/utils/format-datetime-br";

export const metadata: Metadata = {
  title: "KPI Atual — Secundário — ALLOHA FIBRA",
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


export default async function KpiAtualSecundarioPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.profile.role === "GESTOR") {
    redirect("/reports/consolidado");
  }

  const snapshot = await getCurrentMonthSecundario(
    user.profile.emailCorporativo,
  );

  const monthLabel = formatMonthLabel(snapshot.mesRef);
  const dataCorteLabel = snapshot.dataCorte
    ? `dados até ${formatDateBR(snapshot.dataCorte)}`
    : null;

  return (
    <PageTransition>
      <div className="px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="space-y-2">
            <div className="flex items-baseline gap-3">
              <h1 className="ds-h1">KPI</h1>
              <span className="ds-mono text-muted-foreground">
                / atual · secundário
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
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {SECUNDARIO_ORDER.map((slug, idx) => {
                const kpi = snapshot.kpis.get(slug);
                if (!kpi) return null;
                return (
                  <KpiMediumCard key={slug} kpi={kpi} delayIndex={idx} />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
