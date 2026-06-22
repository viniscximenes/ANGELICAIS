import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BasesKpiCards } from "@/components/bases-kpi/bases-kpi-cards";
import { SnapshotsHistory } from "@/components/bases-kpi/snapshots-history";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { getSnapshotsSummary } from "@/lib/kpi/bases/get-snapshots-summary";

export const metadata: Metadata = {
  title: "Base KPI — ANGELICAIS",
};

export default async function BasesKpiPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.profile.role === "GESTOR") redirect("/gestor/d-1");

  if (!can(user.profile.role, "manage_base")) {
    redirect("/d-1");
  }

  const snapshots = await getSnapshotsSummary();
  const existingMonths = snapshots.map((s) => s.mesRef);

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-5xl space-y-10">
          <div className="space-y-1">
            <div className="flex items-baseline gap-3">
              <h1 className="ds-h1">Bases</h1>
              <span className="ds-mono text-muted-foreground">/ KPI</span>
            </div>
            <p className="ds-small text-muted-foreground">
              Cole os dados exportados da planilha do planejamento para
              alimentar o painel de KPI.
            </p>
          </div>

          <BasesKpiCards existingMonths={existingMonths} />

          <SnapshotsHistory snapshots={snapshots} />
        </div>
      </div>
    </PageTransition>
  );
}
