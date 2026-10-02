import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Instrument_Sans } from "next/font/google";

import "./bases-kpi.css";
import { BasesKpiCards } from "@/components/bases-kpi/bases-kpi-cards";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { formatNomeProprio } from "@/lib/gestor/derive-nome-operador";
import {
  getSnapshotsSummary,
  getGestorSnapshotsSummary,
} from "@/lib/kpi/bases/get-snapshots-summary";

export const metadata: Metadata = {
  title: "Bases - KPI",
};

// Mesma fonte de /s/reports/consolidado — carregada só nesta rota e
// referenciada dentro de [data-page="bases-kpi"] (bases-kpi.css).
const zenSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--font-zen-sans",
});

// Reflete na hora upload/delete de KPI — sem janela de cache estático em
// que o histórico de meses fica desatualizado depois de apagar/colar.
export const dynamic = "force-dynamic";

// Piso mínimo do skeleton (loading.tsx) no F5 — mesmo valor e técnica do
// Consolidado: atrasa a resolução deste Server Component até completar
// MIN_LOADING_MS desde a entrada; se as buscas já demoraram mais, não espera.
const MIN_LOADING_MS = 3_000;

async function aguardarPisoMinimo(desde: number) {
  const faltam = MIN_LOADING_MS - (Date.now() - desde);
  if (faltam > 0) {
    await new Promise((resolve) => setTimeout(resolve, faltam));
  }
}

export default async function BasesKpiPage() {
  const inicioCarregamento = Date.now();

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Acesso governado só por can(): ADM puro passa; GESTOR só passa se
  // acumular a skill de admin (is_admin_skill). Sem checagem exclusiva de
  // role antes, pra não barrar o caso multi-role.
  if (!can(user.profile.role, "manage_base", user.profile.isAdminSkill)) {
    redirect("/s/reports/consolidado");
  }

  const userName = formatNomeProprio(user.profile.fullName);

  const [snapshots, gestorSnapshots] = await Promise.all([
    getSnapshotsSummary(),
    getGestorSnapshotsSummary(),
  ]);

  // Só no carregamento do documento (F5 / acesso direto). Requisições RSC
  // (header "rsc": router.refresh() depois de colar/apagar) não esperam —
  // senão o histórico levaria 3s pra refletir a mudança.
  if (!(await headers()).get("rsc")) {
    await aguardarPisoMinimo(inicioCarregamento);
  }

  // Sem PageTransition: mesmo padrão do Consolidado (conteúdo já vem pronto
  // do SSR, sem fade de entrada).
  return (
    <div
      data-page="bases-kpi"
      className={`min-h-screen px-6 py-8 lg:px-12 lg:py-12 ${zenSans.variable}`}
    >
      <div className="mx-auto max-w-7xl space-y-4">
        {/* Cabeçalho = mesmas classes do título/subtítulo do Consolidado. */}
        <header className="pt-4">
          <h1 className="font-sans text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            KPI
          </h1>
          <p className="font-sans text-muted-foreground pt-3 text-sm font-normal">
            {userName}
          </p>
        </header>

        <BasesKpiCards
          snapshots={snapshots}
          gestorSnapshots={gestorSnapshots}
        />
      </div>
    </div>
  );
}
