import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { IconTargetArrow } from "@tabler/icons-react";

import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export const metadata: Metadata = {
  title: "KPI Painel — ANGELICAIS",
};

export default async function KpiPainelPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.profile.role === "GESTOR") redirect("/gestor/d-1");

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-7xl">
          <div className="elevation-1 rounded-xl p-16 text-center">
            <IconTargetArrow
              size={48}
              className="text-muted-foreground mx-auto mb-4"
              aria-hidden="true"
            />
            <h2 className="ds-h2 mb-2">Painel KPI</h2>
            <p className="ds-body text-muted-foreground mx-auto max-w-md">
              Em construção. Em breve você verá seus indicadores mensais aqui.
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
