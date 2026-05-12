import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login/login-form";
import { LoginHero } from "@/components/login/login-hero";
import { PageTransition } from "@/components/motion/page-transition";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Entrar — ANGELICAIS",
};

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/d-1");
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
