import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PausasAtualTable } from "@/components/bases-pausas/pausas-atual-table";
import { PausasPasteForm } from "@/components/bases-pausas/pausas-paste-form";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { formatNomeProprio } from "@/lib/gestor/derive-nome-operador";
import { getPausasProgramadas } from "@/lib/bases/pausas-programadas/actions/get-pausas-programadas";

export const metadata: Metadata = {
  title: "Bases - Pausas",
};

export default async function BasesPausasPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Acesso governado só por can(): ADM puro passa; GESTOR só passa se
  // acumular a skill de admin (is_admin_skill). Sem checagem exclusiva de
  // role antes, pra não barrar o caso multi-role.
  if (!can(user.profile.role, "manage_system", user.profile.isAdminSkill)) {
    redirect("/reports/consolidado");
  }

  const userName = formatNomeProprio(user.profile.fullName);
  const operadores = await getPausasProgramadas();

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-5xl space-y-8">
          <header className="border-border flex flex-col gap-2 border-b border-dashed pb-4">
            <span className="text-muted-foreground text-xs tracking-wide uppercase">
              PAINEL DO ADM
            </span>
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="ds-h1">Pausas</h1>
              <span className="ds-mono-sm text-muted-foreground">
                / Bases · {userName}
              </span>
            </div>
          </header>

          <PausasPasteForm />

          <PausasAtualTable operadores={operadores} />
        </div>
      </div>
    </PageTransition>
  );
}
