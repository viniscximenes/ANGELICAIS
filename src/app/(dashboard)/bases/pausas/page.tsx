import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PausasAtualTable } from "@/components/bases-pausas/pausas-atual-table";
import { PausasPasteForm } from "@/components/bases-pausas/pausas-paste-form";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { getPausasProgramadas } from "@/lib/bases/pausas-programadas/actions/get-pausas-programadas";

export const metadata: Metadata = {
  title: "Pausas Programadas — ANGELICAIS",
};

export default async function BasesPausasPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.profile.role === "GESTOR") redirect("/reports/consolidado");

  if (!can(user.profile.role, "manage_system")) {
    redirect("/d-1");
  }

  const operadores = await getPausasProgramadas();

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-5xl space-y-10">
          <div className="space-y-1">
            <div className="flex items-baseline gap-3">
              <h1 className="ds-h1">Bases</h1>
              <span className="ds-mono text-muted-foreground">
                / Pausas Programadas
              </span>
            </div>
            <p className="ds-small text-muted-foreground">
              Cole a planilha com os horários programados de pausa de cada
              operador.
            </p>
          </div>

          <PausasPasteForm />

          <PausasAtualTable operadores={operadores} />
        </div>
      </div>
    </PageTransition>
  );
}
