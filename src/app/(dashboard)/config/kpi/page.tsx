import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ConfigKpiTabs } from "@/components/config-kpi/config-kpi-tabs";
import { KpiDefinitionCard } from "@/components/config-kpi/kpi-definition-card";
import { KpiMetaGestorCard } from "@/components/config-kpi/kpi-meta-gestor-card";
import { KpiMappingCard } from "@/components/config-kpi/kpi-mapping-card";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { getKpiDefinitions } from "@/lib/kpi/get-definitions";
import { getMetasGestor } from "@/lib/kpi/gestor/get-metas-gestor";

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

  const [definitions, metasGestor] = await Promise.all([
    getKpiDefinitions(),
    getMetasGestor(),
  ]);
  const principais = definitions.filter((d) => d.groupType === "principal");
  const secundarios = definitions.filter((d) => d.groupType === "secundario");

  const metasGestorPrincipais = metasGestor.filter(
    (m) => m.groupType === "principal",
  );
  const metasGestorSecundarios = metasGestor.filter(
    (m) => m.groupType === "secundario",
  );

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

  const metasGestorContent = (
    <div className="space-y-8">
      {metasGestorPrincipais.length > 0 && (
        <div className="space-y-4">
          <p className="ds-mono-sm text-muted-foreground uppercase tracking-widest">
            Principais
          </p>
          {metasGestorPrincipais.map((meta) => (
            <KpiMetaGestorCard key={meta.slug} meta={meta} />
          ))}
        </div>
      )}
      {metasGestorSecundarios.length > 0 && (
        <div className="space-y-4">
          <p className="ds-mono-sm text-muted-foreground uppercase tracking-widest">
            Secundários
          </p>
          {metasGestorSecundarios.map((meta) => (
            <KpiMetaGestorCard key={meta.slug} meta={meta} />
          ))}
        </div>
      )}
      {metasGestor.length === 0 && (
        <p className="ds-small text-muted-foreground">
          Nenhuma meta de supervisor cadastrada. Execute o seed de
          kpi_metas_gestor no banco.
        </p>
      )}
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
            metasGestor={metasGestorContent}
          />
        </div>
      </div>
    </PageTransition>
  );
}
