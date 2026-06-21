import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AtasForm } from "@/components/feedback/atas-form";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getPostLoginPath } from "@/lib/auth/post-login-path";
import { getOperadoresDoGestor } from "@/lib/kpi/gestor/get-operadores-do-gestor";
import { getDatePartsInBR } from "@/lib/utils/format-datetime-br";

export const metadata: Metadata = {
  title: "Atas — ALLOHA FIBRA",
};

export const dynamic = "force-dynamic";

function getCurrentMesRef(): string {
  const { year, month } = getDatePartsInBR();
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

export default async function FeedbackAtasPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  if (user.profile.role !== "GESTOR") {
    redirect(getPostLoginPath(user.profile.role));
  }

  const mesRef = getCurrentMesRef();
  const operadores = await getOperadoresDoGestor(user.profile.fullName, mesRef);
  const defaultQuantidade = operadores.length > 0 ? operadores.length : 15;

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
