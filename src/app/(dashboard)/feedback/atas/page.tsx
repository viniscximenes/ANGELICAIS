import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AtasForm } from "@/components/feedback/atas-form";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getPostLoginPath } from "@/lib/auth/post-login-path";
import { fetchGestorData, resolveGuiaGestor } from "@/lib/google/gestor";

export const metadata: Metadata = {
  title: "Atas — ALLOHA FIBRA",
};

export const dynamic = "force-dynamic";

export default async function FeedbackAtasPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  if (user.profile.role !== "GESTOR") {
    redirect(getPostLoginPath(user.profile.role));
  }

  const guia =
    resolveGuiaGestor(user.profile.username) ??
    resolveGuiaGestor(user.profile.emailCorporativo);

  let defaultQuantidade = 15;
  if (guia) {
    const data = await fetchGestorData(guia);
    if (data && data.operadores && data.operadores.length > 0) {
      defaultQuantidade = data.operadores.length;
    }
  }

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-3xl space-y-8">
          <header className="flex flex-wrap items-baseline gap-3">
            <h1 className="ds-h1">Atas</h1>
            <span className="ds-mono-sm text-muted-foreground">
              / Feedback · Comunicado Interno
            </span>
          </header>

          <AtasForm
            supervisorName={user.profile.fullName}
            defaultQuantidade={defaultQuantidade}
          />
        </div>
      </div>
    </PageTransition>
  );
}
