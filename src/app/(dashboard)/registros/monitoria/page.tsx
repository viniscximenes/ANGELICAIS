import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageTransition } from "@/components/motion/page-transition";
import { MonitoriaListAdmin } from "@/components/registros/monitoria/monitoria-list-admin";
import { MonitoriaListAux } from "@/components/registros/monitoria/monitoria-list-aux";
import { MonitoriaPageActions } from "@/components/registros/monitoria/monitoria-page-actions";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { getAllOperatorsNoGestor } from "@/lib/monitorias/get-all-operators-no-gestor";
import { getAuxOperators } from "@/lib/monitorias/get-aux-operators";
import { getMonitoriasForAdmin } from "@/lib/monitorias/get-monitorias-for-admin";
import { getMonitoriasForAux } from "@/lib/monitorias/get-monitorias-for-aux";

export const metadata: Metadata = {
  title: "Monitoria — ANGELICAIS",
};

export default async function MonitoriaPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!can(user.profile.role, "view_monitoria")) {
    redirect("/d-1");
  }

  const isAdm = can(user.profile.role, "manage_system");

  if (isAdm) {
    const [monitorias, operators, auxOperators] = await Promise.all([
      getMonitoriasForAdmin(),
      getAllOperatorsNoGestor(),
      getAuxOperators(),
    ]);

    return (
      <PageTransition>
        <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-baseline gap-3">
                  <h1 className="ds-h1">Registros</h1>
                  <span className="ds-mono text-muted-foreground">
                    / monitoria
                  </span>
                </div>
                <p className="ds-small text-muted-foreground">
                  Cadastre ligações para monitoria e acompanhe as avaliações dos
                  AUX.
                </p>
              </div>

              <MonitoriaPageActions
                operators={operators}
                auxOperators={auxOperators}
              />
            </div>

            <MonitoriaListAdmin monitorias={monitorias} />
          </div>
        </div>
      </PageTransition>
    );
  }

  const monitorias = await getMonitoriasForAux(user.profile.emailCorporativo);

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="space-y-1">
            <div className="flex items-baseline gap-3">
              <h1 className="ds-h1">Registros</h1>
              <span className="ds-mono text-muted-foreground">
                / monitoria
              </span>
            </div>
            <p className="ds-small text-muted-foreground">
              Suas monitorias atribuídas. Clique em uma para ouvir e avaliar.
            </p>
          </div>

          <MonitoriaListAux monitorias={monitorias} />
        </div>
      </div>
    </PageTransition>
  );
}
