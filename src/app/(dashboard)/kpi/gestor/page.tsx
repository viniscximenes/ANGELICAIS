import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { KpiGestorSection } from "@/components/gestor/kpi-gestor/kpi-gestor-section";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getPostLoginPath } from "@/lib/auth/post-login-path";
import { formatNomeProprio } from "@/lib/gestor/derive-nome-operador";
import { buildKpiGestorCards } from "@/lib/kpi/gestor/build-kpi-gestor-cards";
import { getDefasadosGestorPorKpi } from "@/lib/kpi/gestor/get-defasados-gestor-por-kpi";
import type { KpiGestorMesData } from "@/lib/kpi/gestor/get-kpi-gestor-mes-historico-action";
import { getKpiGestorMetas } from "@/lib/kpi/gestor/get-kpi-gestor-metas";
import { getKpiGestorProprio, type GestorProprioData } from "@/lib/kpi/gestor/get-kpi-gestor-proprio";
import { getMesesDisponiveisGestor } from "@/lib/kpi/gestor/get-meses-disponiveis-gestor";
import { getDatePartsInBR } from "@/lib/utils/format-datetime-br";

export const metadata: Metadata = {
  title: "KPI - Gestor",
};

// Página personalizada por gestor — nunca cacheada entre usuários.
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

function getMesRetrasadoRef(): string {
  const { year, month } = getDatePartsInBR();
  const retMonth = month <= 2 ? month + 10 : month - 2;
  const retYear = month <= 2 ? year - 1 : year;
  return `${retYear}-${String(retMonth).padStart(2, "0")}-01`;
}

export default async function KpiGestorPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  if (user.profile.role !== "GESTOR") {
    redirect(getPostLoginPath(user.profile.role));
  }

  const fullName = user.profile.fullName;
  const gestorId = user.profile.id;
  const mesAtual = getCurrentMesRef();
  const mesPassado = getPreviousMesRef();
  const mesRetrasado = getMesRetrasadoRef();

  const [metas, mesesDisponiveis, proprioAtual, proprioPassado, proprioRetrasado] =
    await Promise.all([
      getKpiGestorMetas(gestorId),
      getMesesDisponiveisGestor(fullName),
      getKpiGestorProprio(fullName, mesAtual),
      getKpiGestorProprio(fullName, mesPassado),
      getKpiGestorProprio(fullName, mesRetrasado),
    ]);

  // Defasados por KPI (equipe fora da meta) pros 3 meses recentes, em
  // paralelo — precisa das metas resolvidas acima primeiro.
  const [defasadosAtual, defasadosPassado, defasadosRetrasado] = await Promise.all([
    getDefasadosGestorPorKpi(gestorId, mesAtual, metas),
    getDefasadosGestorPorKpi(gestorId, mesPassado, metas),
    getDefasadosGestorPorKpi(gestorId, mesRetrasado, metas),
  ]);

  function toMesData(
    proprio: GestorProprioData,
    defasados: Awaited<ReturnType<typeof getDefasadosGestorPorKpi>>,
  ): KpiGestorMesData {
    return {
      mesRef: proprio.mesRef,
      dataCorte: proprio.dataCorte,
      hasData: proprio.hasData,
      cards: buildKpiGestorCards(proprio.valuesBySlug, metas),
      defasados,
    };
  }

  const dataAtual = toMesData(proprioAtual, defasadosAtual);
  const dataPassado = toMesData(proprioPassado, defasadosPassado);
  const dataRetrasado = toMesData(proprioRetrasado, defasadosRetrasado);

  const mesesRecentes = [mesAtual, mesPassado, mesRetrasado];
  const mesesHistoricos = mesesDisponiveis.filter((m) => !mesesRecentes.includes(m));

  const nomeGestor = formatNomeProprio(fullName);

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-7xl">
          <header className="border-border flex flex-col gap-2 border-b border-dashed pb-4">
            <span className="text-muted-foreground text-xs tracking-wide uppercase">
              Painel do Gestor
            </span>
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="ds-h1">Gestor</h1>
              <span className="ds-mono-sm text-muted-foreground">
                / KPI · {nomeGestor}
              </span>
            </div>
          </header>

          <KpiGestorSection
            dataAtual={dataAtual}
            dataPassado={dataPassado}
            dataRetrasado={dataRetrasado}
            mesesHistoricos={mesesHistoricos}
            metasIniciais={metas}
          />
        </div>
      </div>
    </PageTransition>
  );
}
