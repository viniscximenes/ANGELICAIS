import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { KpiGestorProprioSection } from "@/components/gestor/kpi-gestor-proprio-section";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getPostLoginPath } from "@/lib/auth/post-login-path";
import { formatNomeProprio } from "@/lib/gestor/derive-nome-operador";
import { getKpiDefinitions } from "@/lib/kpi/get-definitions";
import { getDefasadosPorKpi } from "@/lib/kpi/gestor/get-defasados-por-kpi";
import { getKpiGestorProprio } from "@/lib/kpi/gestor/get-kpi-gestor-proprio";
import { getMetasGestor } from "@/lib/kpi/gestor/get-metas-gestor";
import { toGestorProprioSerial } from "@/lib/kpi/gestor/to-gestor-proprio-serial";
import { getDatePartsInBR } from "@/lib/utils/format-datetime-br";

export const metadata: Metadata = {
  title: "Meus Resultados — KPI",
};

export const dynamic = "force-dynamic";

function getCurrentMesRef(): string {
  const { year, month } = getDatePartsInBR();
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function getPreviousMesRef(): string {
  const { year, month } = getDatePartsInBR();
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  return `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
}

export default async function MeusResultadosKpiPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  if (user.profile.role !== "GESTOR") {
    redirect(getPostLoginPath(user.profile.role));
  }

  const fullName = user.profile.fullName;
  const mesAtual = getCurrentMesRef();
  const mesPassado = getPreviousMesRef();

  const [definitions, metas, dataAtualRaw, dataPassadoRaw] = await Promise.all([
    getKpiDefinitions(),
    getMetasGestor(),
    getKpiGestorProprio(fullName, mesAtual),
    getKpiGestorProprio(fullName, mesPassado),
  ]);

  // Defasados fetched after definitions (need them as param), but in parallel
  // with snapshot data since it's independent.
  const defasadosMap = await getDefasadosPorKpi(fullName, mesAtual, definitions);
  const defasadosAtual = Object.fromEntries(defasadosMap);

  const dataAtual = toGestorProprioSerial(dataAtualRaw, definitions, metas, false);
  const dataPassado = toGestorProprioSerial(dataPassadoRaw, definitions, metas, true);

  const nomeGestor = formatNomeProprio(fullName);

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-5xl space-y-8">
          <header className="flex flex-wrap items-baseline gap-3">
            <h1 className="ds-h1">Meus Resultados</h1>
            <span className="ds-mono-sm text-muted-foreground">
              / KPI · {nomeGestor}
            </span>
          </header>

          <KpiGestorProprioSection
            dataAtual={dataAtual}
            dataPassado={dataPassado}
            defasadosAtual={defasadosAtual}
          />
        </div>
      </div>
    </PageTransition>
  );
}
