import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { EvolucaoLayout } from "@/components/evolucao/evolucao-layout";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getEvolucaoOperador } from "@/lib/evolucao/get-evolucao-operador";

export const metadata: Metadata = {
  title: "Evolução — KPI — ANGELICAIS",
};

export default async function EvolucaoKpiPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.profile.role === "GESTOR") redirect("/gestor/d-1");

  const data = await getEvolucaoOperador();

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="space-y-2">
            <div className="flex items-baseline gap-3">
              <h1 className="ds-h1">Evolução</h1>
              <span className="ds-mono text-muted-foreground">/ KPI</span>
            </div>
            <p className="ds-mono-sm text-muted-foreground">
              Sua evolução mês a mês nos principais indicadores.
            </p>
          </div>

          {!data ? (
            <div className="elevation-1 rounded-xl p-8 text-center">
              <p className="ds-body text-muted-foreground">
                Erro ao carregar a evolução. Tente recarregar a página.
              </p>
            </div>
          ) : (
            <EvolucaoLayout data={data} />
          )}
        </div>
      </div>
    </PageTransition>
  );
}
