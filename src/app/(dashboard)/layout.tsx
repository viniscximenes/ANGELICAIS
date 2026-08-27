import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppHeader } from "@/components/dashboard/app-header";
import { Sidebar, type SidebarUser } from "@/components/dashboard/sidebar";
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
  // seção "Painel do Gestor" (view_gestor_panel), sem D-1/KPI/RV/etc. Um
  // GESTOR com is_admin_skill acumula, além disso, as seções que só o ADM
  // exclusivo vê (ver getSidebarSectionsForRole).
  const sections = getSidebarSectionsForRole(
    user.profile.role,
    user.profile.isAdminSkill,
  );

  // Header e sidebar compartilham o mesmo usuário resolvido aqui — o header
  // não faz mais a própria chamada de auth (era uma segunda ida ao Supabase
  // por request, e sem acesso a full_name/role).
  const sidebarUser: SidebarUser = {
    fullName: user.profile.fullName,
    role: user.profile.role,
    isAdminSkill: user.profile.isAdminSkill,
  };

  return (
    <div className="min-h-screen">
      <AppHeader user={sidebarUser} sections={sections} />
      <div className="flex">
        <Sidebar sections={sections} user={sidebarUser} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
