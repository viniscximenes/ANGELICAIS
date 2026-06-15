import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login/login-form";
import { LoginHero } from "@/components/login/login-hero";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getPostLoginPath } from "@/lib/auth/post-login-path";

export const metadata: Metadata = {
  title: "Entrar — ANGELICAIS",
};

export default async function LoginPage() {
  // Usuário já autenticado que volta para /login vai para a landing da sua
  // role (por permissão), não para um KPI hardcoded.
  const user = await getCurrentUser();

  if (user) {
    redirect(getPostLoginPath(user.profile.role));
  }

  return (
    <PageTransition className="min-h-screen">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        <LoginHero />
        <LoginForm />
      </div>
    </PageTransition>
  );
}
