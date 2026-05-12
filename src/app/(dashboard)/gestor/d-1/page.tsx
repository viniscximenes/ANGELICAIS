import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { IconChartBar } from "@tabler/icons-react";

import { PageTransition } from "@/components/motion/page-transition";
import {
  StaggerContainer,
  StaggerItem,
} from "@/components/motion/stagger-container";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export const metadata: Metadata = {
  title: "Gestor D-1 — ANGELICAIS",
};

export default async function GestorD1Page() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Operadores/AUX/ADM voltam pra /d-1 (que é a página deles)
  if (user.profile.role !== "GESTOR") {
    redirect("/d-1");
  }

  return (
    <PageTransition>
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="flex flex-col items-center text-center">
          <StaggerContainer
            staggerDelay={0.08}
            className="flex flex-col items-center"
          >
            <StaggerItem>
              <IconChartBar
                size={48}
                className="text-primary"
                aria-hidden="true"
              />
            </StaggerItem>
            <StaggerItem className="mt-6">
              <h1 className="ds-h1">Painel do Gestor</h1>
            </StaggerItem>
            <StaggerItem className="mt-3">
              <p className="ds-body text-muted-foreground max-w-md">
                Sua visão do D-1 está em construção. Em breve você verá os
                indicadores da equipe aqui.
              </p>
            </StaggerItem>
          </StaggerContainer>
        </div>
      </div>
    </PageTransition>
  );
}
