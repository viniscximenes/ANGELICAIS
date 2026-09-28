import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Instrument_Sans } from "next/font/google";

import "./kpi-gestor.css";
import { KpiGestorSection } from "@/components/gestor/kpi-gestor/kpi-gestor-section";
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

// Fonte do tema Zen Linen — carregada só nesta rota (mesmo padrão de
// /kpi/operadores/page.tsx: next/font/google gera uma variável escopada ao
// módulo que a importa, referenciada só dentro de [data-page="kpi-gestor"]
// em kpi-gestor.css, então não afeta nenhuma outra página).
const zenSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--font-zen-sans",
});

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

// Piso mínimo da tela de loading (F5/entrada de rota) — mesma regra de
// /reports/consolidado/page.tsx: a resolução deste Server Component é
// atrasada até completar MIN_LOADING_MS, contados desde a entrada na função.
// Se a busca real já demorou mais que isso, não espera nada.
const MIN_LOADING_MS = 3_000;

async function aguardarPisoMinimo(desde: number) {
  const faltam = MIN_LOADING_MS - (Date.now() - desde);
  if (faltam > 0) {
    await new Promise((resolve) => setTimeout(resolve, faltam));
  }
}

export default async function KpiGestorPage() {
  const inicioCarregamento = Date.now();
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

  await aguardarPisoMinimo(inicioCarregamento);

  return (
    // Sem PageTransition (fade/slide de entrada): loading → cards já na tela.
    <>
      <div
        data-page="kpi-gestor"
        className={`min-h-screen px-6 py-8 lg:px-12 lg:py-12 ${zenSans.variable}`}
      >
        <div className="mx-auto max-w-7xl">
          {/*
            Cabeçalho (título + linha de contexto + seletor de mês + ações) é
            renderizado inteiro dentro de KpiGestorSection — mesmo motivo de
            /kpi/operadores (KpiEquipeSection, NÃO alterado): o mês/dataCorte
            exibidos no subtítulo dependem do mês selecionado, que é estado
            client.
          */}
          <KpiGestorSection
            nomeGestor={nomeGestor}
            dataAtual={dataAtual}
            dataPassado={dataPassado}
            dataRetrasado={dataRetrasado}
            mesesHistoricos={mesesHistoricos}
            metasIniciais={metas}
          />
        </div>
      </div>
    </>
  );
}
