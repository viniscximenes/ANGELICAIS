import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ContratosSection } from "@/components/d-1/contratos-section";
import { D1Header } from "@/components/d-1/d1-header";
import { D1Tabs } from "@/components/d-1/d1-tabs";
import { KpiCards } from "@/components/d-1/kpi-cards";
import { MotivosSection } from "@/components/d-1/motivos-section";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { filterByUserEmail } from "@/lib/d1/filter-by-user";
import { getD1Data } from "@/lib/google/d1";

export const metadata: Metadata = {
  title: "Consolidado — D-1 ALLOHA FIBRA",
};

export const revalidate = 300;

export default async function ConsolidadoPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.profile.role === "GESTOR") {
    redirect("/gestor/d-1");
  }

  const d1Data = await getD1Data();
  const userView = filterByUserEmail(d1Data, user.profile.emailCorporativo);

  const role = user.profile.role;

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-7xl space-y-8">
          <D1Header horaReport={userView.horaReport} subtitle="consolidado" />
          <D1Tabs />
          <div className="space-y-12">
            {can(role, "view_d1_personal") && (
              <>
                <KpiCards operador={userView.operador} />
                <MotivosSection motivos={userView.motivos} />
                <ContratosSection contratos={userView.contratos} />
              </>
            )}

            {/* RelatorioSupervisorView has been removed since Supervisor Report was migrated/removed */}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
