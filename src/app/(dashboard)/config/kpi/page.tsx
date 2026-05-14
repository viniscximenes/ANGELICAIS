import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { IconSettings } from "@tabler/icons-react";

import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: "Configurações KPI — ANGELICAIS",
};

export default async function ConfigKpiPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.profile.role === "GESTOR") redirect("/gestor/d-1");
  if (!can(user.profile.role, "manage_system")) redirect("/d-1");

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-7xl">
          <div className="elevation-1 rounded-xl p-16 text-center">
            <IconSettings
              size={48}
              className="text-muted-foreground mx-auto mb-4"
              aria-hidden="true"
            />
            <h2 className="ds-h2 mb-2">Configurações KPI</h2>
            <p className="ds-body text-muted-foreground mx-auto max-w-md">
              Em construção. Aqui você poderá mapear colunas e definir metas dos
              KPIs.
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
