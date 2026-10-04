import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Instrument_Sans } from "next/font/google";

import "./bases-pausas.css";
import { PausasAtualTable } from "@/components/bases-pausas/pausas-atual-table";
import { PausasPasteForm } from "@/components/bases-pausas/pausas-paste-form";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { formatNomeProprio } from "@/lib/gestor/derive-nome-operador";
import { getPausasProgramadas } from "@/lib/bases/pausas-programadas/actions/get-pausas-programadas";

export const metadata: Metadata = {
  title: "Bases - Pausas",
};

// Mesma fonte de /s/reports/consolidado e /s/bases/kpi — carregada só nesta
// rota e referenciada dentro de [data-page="bases-pausas"] (bases-pausas.css).
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

export default async function BasesPausasPage() {
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
  const operadores = await getPausasProgramadas();

  // Só no carregamento do documento (F5 / acesso direto). Requisições RSC
  // (router.refresh() depois de colar/limpar) não esperam.
  if (!(await headers()).get("rsc")) {
    await aguardarPisoMinimo(inicioCarregamento);
  }

  // Sem PageTransition: depois do skeleton o conteúdo só aparece.
  return (
    <div
      data-page="bases-pausas"
      className={`min-h-screen px-6 py-8 lg:px-12 lg:py-12 ${zenSans.variable}`}
    >
      <div className="mx-auto max-w-7xl space-y-4">
        {/* Cabeçalho = mesmas classes do título/subtítulo do Consolidado. */}
        <header className="pt-4">
          <h1 className="font-sans text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Pausas
          </h1>
          <p className="font-sans text-muted-foreground pt-3 text-sm font-normal">
            {userName}
          </p>
        </header>

        <PausasPasteForm />

        <PausasAtualTable operadores={operadores} />
      </div>
    </div>
  );
}
