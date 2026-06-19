import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login/login-form";
import { LoginHero } from "@/components/login/login-hero";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getPostLoginPath } from "@/lib/auth/post-login-path";

export const metadata: Metadata = {
  title: "Entrar — Alloha Fibra",
};

export default async function LoginPage() {
  // Usuário já autenticado que volta para /login vai para a landing da sua
  // role (por permissão), não para um KPI hardcoded.
  const user = await getCurrentUser();

  if (user) {
    redirect(getPostLoginPath(user.profile.role));
  }

  return (
    <PageTransition className="min-h-screen relative overflow-hidden bg-background">
      {/* Glow unificado de fundo azul cobrindo as duas colunas */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20 z-0" 
        style={{
          background: "radial-gradient(circle at 40% 50%, #091755 0%, transparent 65%)"
        }}
      />
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2 relative z-10">
        <LoginHero />
        <LoginForm />
      </div>
    </PageTransition>
  );
}
