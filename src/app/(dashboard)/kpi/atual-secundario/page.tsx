import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { IconTargetArrow } from "@tabler/icons-react";

import { KpiTabs } from "@/components/kpi/kpi-tabs";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export const metadata: Metadata = {
  title: "KPI Atual — Secundário — ANGELICAIS",
};

export default async function KpiAtualSecundarioPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.profile.role === "GESTOR") redirect("/gestor/d-1");

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="space-y-2">
            <div className="flex items-baseline gap-3">
              <h1 className="ds-h1">KPI</h1>
              <span className="ds-mono text-muted-foreground">
                / atual · secundário
              </span>
            </div>
          </div>

          <KpiTabs />

          <div className="elevation-1 rounded-xl p-16 text-center">
            <IconTargetArrow
              size={48}
              className="text-muted-foreground mx-auto mb-4"
              aria-hidden="true"
            />
            <h2 className="ds-h2 mb-2">KPIs secundários</h2>
            <p className="ds-body text-muted-foreground mx-auto max-w-md">
              Em construção. Em breve aqui aparecerão os 9 KPIs secundários.
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
