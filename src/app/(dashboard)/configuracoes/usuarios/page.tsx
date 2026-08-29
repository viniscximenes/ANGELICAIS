import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageTransition } from "@/components/motion/page-transition";
import { UsersPageActions } from "@/components/config/usuarios/users-page-actions";
import { UsersTable } from "@/components/config/usuarios/users-table";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { formatNomeProprio } from "@/lib/gestor/derive-nome-operador";
import { getAllUsers } from "@/lib/users/get-all-users";

export const metadata: Metadata = {
  title: "Configurações de Usuários — ANGELICAIS",
};

export default async function ConfigUsuariosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.profile.role === "GESTOR") redirect("/reports/consolidado");
  if (!can(user.profile.role, "manage_system", user.profile.isAdminSkill)) redirect("/reports/consolidado");

  const userName = formatNomeProprio(user.profile.fullName);
  const users = await getAllUsers();

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-4xl space-y-6">
          <header className="border-border flex items-end justify-between border-b border-dashed pb-4">
            <div className="flex flex-col gap-2">
              <span className="text-muted-foreground text-xs tracking-wide uppercase">
                PAINEL DO ADM
              </span>
              <div className="flex flex-wrap items-baseline gap-3">
                <h1 className="ds-h1">Usuários</h1>
                <span className="ds-mono-sm text-muted-foreground">
                  / Configurações · {userName}
                </span>
              </div>
            </div>

            <UsersPageActions />
          </header>

          <UsersTable users={users} currentUserId={user.profile.id} />
        </div>
      </div>
    </PageTransition>
  );
}
