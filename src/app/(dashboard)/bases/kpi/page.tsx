import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BasesKpiCards } from "@/components/bases-kpi/bases-kpi-cards";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { formatNomeProprio } from "@/lib/gestor/derive-nome-operador";
import {
  getSnapshotsSummary,
  getGestorSnapshotsSummary,
} from "@/lib/kpi/bases/get-snapshots-summary";

export const metadata: Metadata = {
  title: "Bases - KPI",
};

export default async function BasesKpiPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Acesso governado só por can(): ADM puro passa; GESTOR só passa se
  // acumular a skill de admin (is_admin_skill). Sem checagem exclusiva de
  // role antes, pra não barrar o caso multi-role.
  if (!can(user.profile.role, "manage_base", user.profile.isAdminSkill)) {
    redirect("/reports/consolidado");
  }

  const userName = formatNomeProprio(user.profile.fullName);

  const [snapshots, gestorSnapshots] = await Promise.all([
    getSnapshotsSummary(),
    getGestorSnapshotsSummary(),
  ]);
  const existingMonths = snapshots.map((s) => s.mesRef);

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body {
                scrollbar-width: thin !important;
                scrollbar-color: var(--border) transparent !important;
              }
              html::-webkit-scrollbar, body::-webkit-scrollbar {
                width: 8px !important;
                height: 8px !important;
              }
              html::-webkit-scrollbar-track, body::-webkit-scrollbar-track {
                background: transparent !important;
              }
              html::-webkit-scrollbar-thumb, body::-webkit-scrollbar-thumb {
                background: var(--border) !important;
                border-radius: 4px !important;
              }
              html::-webkit-scrollbar-thumb:hover, body::-webkit-scrollbar-thumb:hover {
                background: var(--muted-foreground) !important;
              }
            `,
          }}
        />
        <div className="mx-auto max-w-5xl space-y-8">
          <header className="border-border flex flex-col gap-2 border-b border-dashed pb-4">
            <span className="text-muted-foreground text-xs tracking-wide uppercase">
              PAINEL DO ADM
            </span>
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="ds-h1">KPI</h1>
              <span className="ds-mono-sm text-muted-foreground">
                / Bases · {userName}
              </span>
            </div>
          </header>

          <BasesKpiCards
            existingMonths={existingMonths}
            snapshots={snapshots}
            gestorSnapshots={gestorSnapshots}
          />
        </div>
      </div>
    </PageTransition>
  );
}
