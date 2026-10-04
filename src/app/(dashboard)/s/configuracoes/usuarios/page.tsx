import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Instrument_Sans } from "next/font/google";

import "./configuracoes-usuarios.css";
import { UsersPageActions } from "@/components/config/usuarios/users-page-actions";
import { UsersTable } from "@/components/config/usuarios/users-table";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { formatNomeProprio } from "@/lib/gestor/derive-nome-operador";
import { getAllUsers } from "@/lib/users/get-all-users";

export const metadata: Metadata = {
  title: "Configurações - Usuários",
};

// Mesma fonte do Consolidado e de /s/bases — carregada só nesta rota e
// referenciada dentro de [data-page="config-usuarios"].
const zenSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--font-zen-sans",
});

// Piso mínimo do skeleton (loading.tsx) no F5 — mesmo valor e técnica de
// /s/bases/kpi e do Consolidado.
const MIN_LOADING_MS = 3_000;

async function aguardarPisoMinimo(desde: number) {
  const faltam = MIN_LOADING_MS - (Date.now() - desde);
  if (faltam > 0) {
    await new Promise((resolve) => setTimeout(resolve, faltam));
  }
}

export default async function ConfigUsuariosPage() {
  const inicioCarregamento = Date.now();

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Acesso governado só por can(): ADM puro passa; GESTOR só passa se
  // acumular a skill de admin (is_admin_skill). Sem checagem exclusiva de
  // role antes, pra não barrar o caso multi-role.
  if (!can(user.profile.role, "manage_system", user.profile.isAdminSkill)) {
    redirect("/s/reports/consolidado");
  }

  const userName = formatNomeProprio(user.profile.fullName);
  const users = await getAllUsers();

  // Só no carregamento do documento (F5 / acesso direto). Requisições RSC
  // (router.refresh() depois de criar/editar/deletar) não esperam.
  if (!(await headers()).get("rsc")) {
    await aguardarPisoMinimo(inicioCarregamento);
  }

  // Sem PageTransition: depois do skeleton o conteúdo só aparece.
  return (
    <div
      data-page="config-usuarios"
      className={`min-h-screen px-6 py-8 lg:px-12 lg:py-12 ${zenSans.variable}`}
    >
      <div className="mx-auto max-w-2xl space-y-4">
        {/* Cabeçalho = mesmas classes do título/subtítulo do Consolidado. */}
        <header className="pt-4">
          <h1 className="font-sans text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Usuários
          </h1>
          <p className="font-sans text-muted-foreground pt-3 text-sm font-normal">
            {userName}
          </p>
        </header>

        {/* Linha de controles (padrão do Consolidado), abaixo do cabeçalho. */}
        <div className="flex flex-wrap items-center gap-2">
          <UsersPageActions />
        </div>

        <UsersTable users={users} currentUserId={user.profile.id} />
      </div>
    </div>
  );
}
