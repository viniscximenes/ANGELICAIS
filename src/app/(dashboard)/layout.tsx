import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppHeader } from "@/components/dashboard/app-header";
import { Sidebar } from "@/components/dashboard/sidebar";
import { getSidebarSectionsForRole } from "@/components/dashboard/sidebar-sections";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // O GESTOR também recebe a sidebar — filtrada por permissão, ela mostra só a
  // seção "Painel do Gestor" (view_gestor_panel), sem D-1/KPI/RV/etc.
  const sections = getSidebarSectionsForRole(user.profile.role);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <div className="flex">
        <Sidebar sections={sections} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
