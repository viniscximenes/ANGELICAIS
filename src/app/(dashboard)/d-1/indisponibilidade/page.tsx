import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { D1Header } from "@/components/d-1/d1-header";
import { D1Tabs } from "@/components/d-1/d1-tabs";
import { IndispCards } from "@/components/d-1/indisponibilidade/indisp-cards";
import { IndispEquipeSection } from "@/components/d-1/indisponibilidade/indisp-equipe-section";
import { IndispPausasSection } from "@/components/d-1/indisponibilidade/indisp-pausas-section";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { getOperadorIndisponibilidade } from "@/lib/d1-db/get-operador-indisponibilidade";
import { getTodosOperadoresIndisponibilidade } from "@/lib/d1-db/get-todos-indisponibilidade";

export const metadata: Metadata = {
  title: "Indisponibilidade — D-1 ALLOHA FIBRA",
};

export const revalidate = 300;

export default async function IndisponibilidadePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.profile.role === "GESTOR") {
    redirect("/reports/consolidado");
  }

  const [userView, data] = await Promise.all([
    getOperadorIndisponibilidade(user.profile.emailCorporativo),
    getTodosOperadoresIndisponibilidade(),
  ]);

  const role = user.profile.role;

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-7xl space-y-8">
          <D1Header
            horaReport={userView.horaReport}
            subtitle="indisponibilidade"
          />
          <D1Tabs />
          <div className="space-y-12">
            {can(role, "view_d1_personal") && (
              <IndispCards indisp={userView.indisp} pausa={userView.pausa} />
            )}

            {can(role, "view_d1_team") && (
              <IndispEquipeSection
                operadoresIndisp={data.operadoresIndisp}
                operadoresPausa={data.operadoresPausa}
              />
            )}

            {can(role, "manage_system") && (
              <IndispPausasSection
                operadoresIndisp={data.operadoresIndisp}
                operadoresPausa={data.operadoresPausa}
              />
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
