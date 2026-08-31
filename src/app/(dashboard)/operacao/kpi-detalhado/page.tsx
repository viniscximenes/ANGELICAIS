import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { KpiDetalhadoSection } from "@/components/operacional/kpi-detalhado/kpi-detalhado-section";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getPostLoginPath } from "@/lib/auth/post-login-path";
import { getKpiDetalhado } from "@/lib/kpi/detalhado/get-kpi-detalhado";

export const metadata: Metadata = {
  title: "Operação - KPI Detalhado",
};

// Snapshot de todas as equipes, embaralhado a cada request — nunca cacheado.
export const dynamic = "force-dynamic";

export default async function KpiDetalhadoPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  // Mesmo gate das demais telas do gestor: só role GESTOR (com ou sem
  // is_admin_skill). O ADM tem view_gestor_panel mas é confinado a /bases e
  // /configuracoes pelo middleware.
  if (user.profile.role !== "GESTOR") {
    redirect(getPostLoginPath(user.profile.role));
  }

  const dados = await getKpiDetalhado();

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-[1700px] space-y-2">
          <KpiDetalhadoSection dados={dados} />
        </div>
      </div>
    </PageTransition>
  );
}
