import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ContratosSection } from "@/components/d-1/contratos-section";
import { D1Header } from "@/components/d-1/d1-header";
import { D1Tabs } from "@/components/d-1/d1-tabs";
import { KpiCards } from "@/components/d-1/kpi-cards";
import { MotivosSection } from "@/components/d-1/motivos-section";
import { RelatorioSupervisorView } from "@/components/d-1/relatorio/relatorio-supervisor-view";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { filterByUserEmail } from "@/lib/d1/filter-by-user";
import { getEvolucaoTxHoje } from "@/lib/d1/evolucao/get-evolucao-tx-hoje";
import { getSupervisoresDistintos } from "@/lib/d1/supervisor";
import { getD1Data } from "@/lib/google/d1";

export const metadata: Metadata = {
  title: "Consolidado — D-1 ANGELICAIS",
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

  const [d1Data, evolucaoSnapshots] = await Promise.all([
    getD1Data(),
    getEvolucaoTxHoje(),
  ]);
  const userView = filterByUserEmail(d1Data, user.profile.emailCorporativo);

  // Lista de supervisores (coluna B) para o seletor da seção de equipe.
  const supervisores = getSupervisoresDistintos(d1Data.consolidado.operadores);

  const role = user.profile.role;
  // RELATORIO não tem linha na planilha: a parte pessoal apareceria zerada e
  // é inútil. Ele vê apenas a seção de equipe (tabela + seletor + export).
  const isRelatorio = role === "RELATORIO";

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-7xl space-y-8">
          <D1Header horaReport={userView.horaReport} subtitle="consolidado" />
          <D1Tabs />
          <div className="space-y-12">
            {!isRelatorio && can(role, "view_d1_personal") && (
              <>
                <KpiCards operador={userView.operador} />
                <MotivosSection motivos={userView.motivos} />
                <ContratosSection contratos={userView.contratos} />
              </>
            )}

            {can(role, "view_d1_team") && (
              <RelatorioSupervisorView
                consolidado={d1Data.consolidado}
                supervisores={supervisores}
                snapshots={evolucaoSnapshots}
                showUpload={can(role, "manage_d1_base")}
              />
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
