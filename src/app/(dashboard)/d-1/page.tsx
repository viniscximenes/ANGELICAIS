import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ContratosSection } from "@/components/d-1/contratos-section";
import { D1Header } from "@/components/d-1/d1-header";
import { EquipeSection } from "@/components/d-1/equipe-section";
import { KpiCards } from "@/components/d-1/kpi-cards";
import { MotivosSection } from "@/components/d-1/motivos-section";
import { UploadSection } from "@/components/d-1/upload-section";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { filterByUserEmail } from "@/lib/d1/filter-by-user";
import { getD1Data } from "@/lib/google/d1";

export const metadata: Metadata = {
  title: "D-1 — ANGELICAIS",
};

export const revalidate = 300;

export default async function D1Page() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // GESTOR não acessa /d-1 — será redirecionado para /gestor/d-1 (futuro)
  if (user.profile.role === "GESTOR") {
    redirect("/gestor/d-1");
  }

  const d1Data = await getD1Data();
  const userView = filterByUserEmail(d1Data, user.profile.emailCorporativo);

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-7xl space-y-12">
          <D1Header horaReport={userView.horaReport} />
          <KpiCards operador={userView.operador} />
          <MotivosSection motivos={userView.motivos} />
          <ContratosSection contratos={userView.contratos} />

          {can(user.profile.role, "view_d1_team") && (
            <EquipeSection
              operadores={d1Data.consolidado.operadores}
              equipe={d1Data.consolidado.equipe}
            />
          )}

          {can(user.profile.role, "manage_base") && <UploadSection />}
        </div>
      </div>
    </PageTransition>
  );
}
