import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AtendimentoLayout } from "@/components/atendimento/atendimento-layout";
import { PageTransition } from "@/components/motion/page-transition";
import { getPerformanceOperador } from "@/lib/atendimento/get-performance-operador";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export const metadata: Metadata = {
  title: "Atendimento — ANGELICAIS",
};

export default async function AtendimentoPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.profile.role === "GESTOR") redirect("/d-1");

  const performance = await getPerformanceOperador();

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="space-y-1">
            <h1 className="ds-h1">Atendimento</h1>
            <p className="ds-small text-muted-foreground">
              Painel ao vivo para retenção. Montador de protocolo e performance
              acumulada.
            </p>
          </div>

          <AtendimentoLayout performance={performance} />
        </div>
      </div>
    </PageTransition>
  );
}
