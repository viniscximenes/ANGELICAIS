import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ResultadoSemanalForm } from "@/components/feedback/resultado-semanal-form";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getPostLoginPath } from "@/lib/auth/post-login-path";
import { formatNomeProprio } from "@/lib/gestor/derive-nome-operador";

export const metadata: Metadata = {
  title: "Feedback Resultado Semanal — ALLOHA FIBRA",
};

export const dynamic = "force-dynamic";

export default async function FeedbackResultadoSemanalPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  if (user.profile.role !== "GESTOR") {
    redirect(getPostLoginPath(user.profile.role));
  }

  const supervisorName = formatNomeProprio(user.profile.fullName);

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-3xl space-y-8">
          <header className="flex flex-wrap items-baseline gap-3">
            <h1 className="ds-h1">Resultado Semanal</h1>
            <span className="ds-mono-sm text-muted-foreground">
              / Feedback · {supervisorName}
            </span>
          </header>

          <ResultadoSemanalForm supervisorName={user.profile.fullName} />
        </div>
      </div>
    </PageTransition>
  );
}
