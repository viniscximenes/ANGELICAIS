import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DashboardRetencaoSkeleton } from "@/components/dashboard/retencao/dashboard-retencao-skeleton";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getPostLoginPath } from "@/lib/auth/post-login-path";
import { getEmailsEquipe } from "@/lib/retencao/get-emails-equipe";

export const metadata: Metadata = {
  title: "Dashboard de Retenção — ALLOHA FIBRA",
};

export default async function DashboardRetencaoPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Apenas role GESTOR acessa este painel
  if (user.profile.role !== "GESTOR") {
    redirect(getPostLoginPath(user.profile.role));
  }

  const id = user.profile.username || user.profile.emailCorporativo;
  const emailsEquipe = await getEmailsEquipe(id);

  return <DashboardRetencaoSkeleton emailsEquipe={emailsEquipe} userKey={id} />;
}
