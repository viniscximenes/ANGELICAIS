import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageTransition } from "@/components/motion/page-transition";
import { UsersPageActions } from "@/components/config/usuarios/users-page-actions";
import { UsersTable } from "@/components/config/usuarios/users-table";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { getAllUsers } from "@/lib/users/get-all-users";

export const metadata: Metadata = {
  title: "Configurações de Usuários — ANGELICAIS",
};

export default async function ConfigUsuariosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.profile.role === "GESTOR") redirect("/gestor/d-1");
  if (!can(user.profile.role, "manage_system")) redirect("/d-1");

  const users = await getAllUsers();

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-baseline gap-3">
                <h1 className="ds-h1">Configurações</h1>
                <span className="ds-mono text-muted-foreground">
                  / usuários
                </span>
              </div>
              <p className="ds-small text-muted-foreground">
                Gerencie cadastros, roles e senhas da equipe.
              </p>
            </div>

            <UsersPageActions />
          </div>

          <UsersTable users={users} currentUserId={user.profile.id} />
        </div>
      </div>
    </PageTransition>
  );
}
