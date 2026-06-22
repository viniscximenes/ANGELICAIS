import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageTransition } from "@/components/motion/page-transition";
import { QuartilEquipeSection } from "@/components/operacional/quartil-equipe-section";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getPostLoginPath } from "@/lib/auth/post-login-path";
import { formatNomeProprio } from "@/lib/gestor/derive-nome-operador";
import { getKpiDefinitions } from "@/lib/kpi/get-definitions";
import { getQuartilEmpresa } from "@/lib/kpi/gestor/get-quartil-empresa";
import { getQuartilEquipe } from "@/lib/kpi/gestor/get-quartil-equipe";
import { toQuartilEquipeSerial } from "@/lib/kpi/gestor/quartil-serial-types";
import { getDatePartsInBR } from "@/lib/utils/format-datetime-br";

export const metadata: Metadata = {
  title: "Quartil — Operacional ALLOHA FIBRA",
};

export const dynamic = "force-dynamic";

function getMesAtual(): string {
  const { year, month } = getDatePartsInBR();
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

export default async function OperacionalQuartilPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  if (user.profile.role !== "GESTOR") {
    redirect(getPostLoginPath(user.profile.role));
  }

  const fullName = user.profile.fullName;
  const mesAtual = getMesAtual();

  const [definitions, dataEquipeRaw, dataEmpresaRaw] = await Promise.all([
    getKpiDefinitions(),
    getQuartilEquipe(fullName, mesAtual),
    getQuartilEmpresa(fullName, mesAtual),
  ]);

  const nomeGestora = formatNomeProprio(fullName);

  if (dataEquipeRaw.operadores.length === 0) {
    return (
      <PageTransition>
        <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
          <div className="mx-auto max-w-7xl space-y-8">
            <header className="flex flex-wrap items-baseline gap-3">
              <h1 className="ds-h1">Quartil</h1>
              <span className="ds-mono-sm text-muted-foreground">
                / Operacional · {nomeGestora}
              </span>
            </header>
            <div
              className="elevation-1 ds-body text-muted-foreground rounded-xl px-6 py-10 text-center"
              style={{ border: "1px solid var(--border)" }}
            >
              Nenhum operador na sua equipe neste mês.
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  const dataEquipe = toQuartilEquipeSerial(dataEquipeRaw, definitions);
  const dataEmpresa = toQuartilEquipeSerial(dataEmpresaRaw, definitions);

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-7xl space-y-8">
          <header className="flex flex-wrap items-baseline gap-3">
            <h1 className="ds-h1">Quartil</h1>
            <span className="ds-mono-sm text-muted-foreground">
              / Operacional · {nomeGestora}
            </span>
          </header>

          <QuartilEquipeSection dataEquipe={dataEquipe} dataEmpresa={dataEmpresa} />
        </div>
      </div>
    </PageTransition>
  );
}
