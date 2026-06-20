import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { D1Header } from "@/components/d-1/d1-header";
import { D1Tabs } from "@/components/d-1/d1-tabs";
import { TempoLogadoCards } from "@/components/d-1/tempo-logado/tempo-logado-cards";
import { TempoLogadoEquipeSection } from "@/components/d-1/tempo-logado/tempo-logado-equipe-section";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { filterTempoLogadoByEmail } from "@/lib/d1/tempo-logado/filter-by-user";
import { getTempoLogadoData } from "@/lib/google/d1/tempo-logado";

export const metadata: Metadata = {
  title: "Tempo Logado — D-1 ALLOHA FIBRA",
};

export const revalidate = 300;

export default async function TempoLogadoPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // GESTOR já é redirecionado pelo layout, mas double-check pra segurança
  if (user.profile.role === "GESTOR") {
    redirect("/gestor/d-1");
  }

  const data = await getTempoLogadoData();
  const userView = filterTempoLogadoByEmail(data, user.profile.emailCorporativo);

  const role = user.profile.role;
  // RELATORIO não tem linha na planilha: vê apenas a seção de equipe.
  const isRelatorio = role === "RELATORIO";

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-7xl space-y-8">
          <D1Header horaReport={userView.horaReport} subtitle="tempo logado" />
          <D1Tabs />
          <div className="space-y-12">
            {!isRelatorio && can(role, "view_d1_personal") && (
              <TempoLogadoCards
                tempoLogado={userView.tempoLogado}
                loginLogout={userView.loginLogout}
              />
            )}

            {can(role, "view_d1_team") && (
              <TempoLogadoEquipeSection
                operadores={data.operadores}
                loginLogout={data.loginLogout}
                showUpload={can(role, "manage_d1_base")}
              />
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
