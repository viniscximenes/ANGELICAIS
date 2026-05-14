import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ConfigKpiTabs } from "@/components/config-kpi/config-kpi-tabs";
import { KpiDefinitionCard } from "@/components/config-kpi/kpi-definition-card";
import { KpiMappingCard } from "@/components/config-kpi/kpi-mapping-card";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { getKpiDefinitions } from "@/lib/kpi/get-definitions";

export const metadata: Metadata = {
  title: "Configurações KPI — ANGELICAIS",
};

export default async function ConfigKpiPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.profile.role === "GESTOR") {
    redirect("/gestor/d-1");
  }

  if (!can(user.profile.role, "manage_system")) {
    redirect("/d-1");
  }

  const definitions = await getKpiDefinitions();
  const principais = definitions.filter((d) => d.groupType === "principal");
  const secundarios = definitions.filter((d) => d.groupType === "secundario");

  const principaisContent = (
    <div className="space-y-4">
      {principais.map((kpi) => (
        <KpiDefinitionCard key={kpi.id} kpi={kpi} />
      ))}
    </div>
  );

  const secundariosContent = (
    <div className="space-y-4">
      {secundarios.map((kpi) => (
        <KpiDefinitionCard key={kpi.id} kpi={kpi} />
      ))}
    </div>
  );

  const mapeamentoContent = (
    <div className="space-y-4">
      {definitions.map((kpi) => (
        <KpiMappingCard key={kpi.id} kpi={kpi} />
      ))}
    </div>
  );

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="space-y-1">
            <div className="flex items-baseline gap-3">
              <h1 className="ds-h1">Configurações</h1>
              <span className="ds-mono text-muted-foreground">/ KPI</span>
            </div>
            <p className="ds-small text-muted-foreground">
              Defina metas dos KPIs e o nome dos cabeçalhos que o sistema
              procura ao colar dados.
            </p>
          </div>

          <ConfigKpiTabs
            principais={principaisContent}
            secundarios={secundariosContent}
            mapeamento={mapeamentoContent}
          />
        </div>
      </div>
    </PageTransition>
  );
}
