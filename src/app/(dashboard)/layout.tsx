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

  const isGestor = user.profile.role === "GESTOR";

  if (isGestor) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        {children}
      </div>
    );
  }

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
