import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { IconRocket } from "@tabler/icons-react";

import { PageTransition } from "@/components/motion/page-transition";
import {
  StaggerContainer,
  StaggerItem,
} from "@/components/motion/stagger-container";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/auth/logout-action";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard — ANGELICAIS",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <PageTransition className="min-h-screen">
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="flex flex-col items-center text-center">
          <StaggerContainer
            staggerDelay={0.08}
            className="flex flex-col items-center"
          >
            <StaggerItem>
              <IconRocket
                size={48}
                className="text-primary"
                aria-hidden="true"
              />
            </StaggerItem>

            <StaggerItem className="mt-6">
              <h1 className="ds-h1">Bem-vindo ao ANGELICAIS</h1>
            </StaggerItem>

            <StaggerItem className="mt-3">
              <p className="ds-body text-muted-foreground max-w-md">
                Seu painel está em construção. Em breve você verá seus
                indicadores aqui.
              </p>
            </StaggerItem>
          </StaggerContainer>

          <form action={logoutAction} className="mt-8">
            <Button type="submit" variant="outline">
              Sair
            </Button>
          </form>
        </div>
      </div>
    </PageTransition>
  );
}
