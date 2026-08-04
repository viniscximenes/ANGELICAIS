import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageTransition } from "@/components/motion/page-transition";
import { KpiEquipeSection } from "@/components/operacional/kpi-equipe-section";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getPostLoginPath } from "@/lib/auth/post-login-path";
import { getRosterOperadoresGestor } from "@/lib/d1-db/get-roster-gestor";
import { formatNomeProprio } from "@/lib/gestor/derive-nome-operador";
import { resolverNomeExibicao } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import { getNomeFantasiaConfig } from "@/lib/gestor/nome-fantasia/get-config";
import { getKpiDefinitions } from "@/lib/kpi/get-definitions";
import { getKpiColunasConfig } from "@/lib/kpi/gestor/get-kpi-colunas-config";
import { getKpiEquipePorEmails } from "@/lib/kpi/gestor/get-kpi-equipe-gestor";
import { KPI_COLUNAS_ORDER } from "@/lib/kpi/gestor/kpi-colunas-config";
import { toKpiEquipeSerial, type KpiEquipeSerial } from "@/lib/kpi/gestor/serial-types";
import { stripUnitSuffix } from "@/lib/kpi/strip-unit-suffix";
import { getDatePartsInBR } from "@/lib/utils/format-datetime-br";

export const metadata: Metadata = {
  title: "KPI Equipe — Operacional ALLOHA FIBRA",
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

export default async function OperacionalKpiPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  if (user.profile.role !== "GESTOR") {
    redirect(getPostLoginPath(user.profile.role));
  }

  const fullName = user.profile.fullName;
  const mesAtual = getCurrentMesRef();
  const mesPassado = getPreviousMesRef();
  const mesRetrasado = getMesRetrasadoRef();

  // Equipe = roster cadastrado pelo gestor em Configurações → Operadores do
  // D-1 (d1_operadores_gestor), não mais o meta_gestor do KPI — evita puxar
  // operadores que já saíram do time ou de outro gestor com nome parecido.
  // Independe de mês, então os 3 toggles (atual/passado/retrasado) sempre
  // usam a mesma lista. Roda em paralelo com definitions/config de nome
  // fantasia (independentes).
  const [emailsEquipe, definitions, nomeFantasiaConfig, kpiColunasVisiveis] =
    await Promise.all([
      getRosterOperadoresGestor(user.profile.id),
      getKpiDefinitions(),
      getNomeFantasiaConfig(user.profile.id),
      getKpiColunasConfig(user.profile.id),
    ]);

  const colunasDisponiveis = KPI_COLUNAS_ORDER.map((slug) => {
    const def = definitions.find((d) => d.slug === slug);
    return { slug, label: def ? stripUnitSuffix(def.displayName) : slug };
  });

  // KPIs dos mesmos operadores nos 3 meses, em paralelo.
  const [dataAtualRaw, dataPassadoRaw, dataRetrasadoRaw] = await Promise.all([
    getKpiEquipePorEmails(emailsEquipe, definitions, mesAtual, false),
    getKpiEquipePorEmails(emailsEquipe, definitions, mesPassado, true),
    getKpiEquipePorEmails(emailsEquipe, definitions, mesRetrasado, true),
  ]);

  const nomeFantasia = {
    ativo: nomeFantasiaConfig.ativo,
    mapa: Object.fromEntries(nomeFantasiaConfig.mapa),
  };

  // Resolve nome fantasia (ou nome real derivado, se não configurado) —
  // mesma função usada pelo D-1 Consolidado (resolverNomeExibicao).
  function comNomeFantasia(serial: KpiEquipeSerial): KpiEquipeSerial {
    return {
      ...serial,
      operadores: serial.operadores.map((op) => ({
        ...op,
        nome: resolverNomeExibicao(op.email, nomeFantasia),
      })),
    };
  }

  const dataAtual = comNomeFantasia(toKpiEquipeSerial(dataAtualRaw, definitions));
  const dataPassado = comNomeFantasia(toKpiEquipeSerial(dataPassadoRaw, definitions));
  const dataRetrasado = comNomeFantasia(toKpiEquipeSerial(dataRetrasadoRaw, definitions));

  const nomeGestora = formatNomeProprio(fullName);

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body {
                scrollbar-width: thin !important;
                scrollbar-color: var(--border) transparent !important;
              }
              html::-webkit-scrollbar, body::-webkit-scrollbar {
                width: 8px !important;
                height: 8px !important;
              }
              html::-webkit-scrollbar-track, body::-webkit-scrollbar-track {
                background: transparent !important;
              }
              html::-webkit-scrollbar-thumb, body::-webkit-scrollbar-thumb {
                background: var(--border) !important;
                border-radius: 4px !important;
              }
              html::-webkit-scrollbar-thumb:hover, body::-webkit-scrollbar-thumb:hover {
                background: var(--muted-foreground) !important;
              }
            `,
          }}
        />
        <div className="mx-auto max-w-7xl">
          <header className="border-border flex flex-col gap-2 border-b border-dashed pb-4">
            <span className="text-muted-foreground text-xs tracking-wide uppercase">
              Painel do Gestor
            </span>
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="ds-h1">KPI</h1>
              <span className="ds-mono-sm text-muted-foreground">
                / Operacional · {nomeGestora}
              </span>
            </div>
          </header>

          <KpiEquipeSection
            dataAtual={dataAtual}
            dataPassado={dataPassado}
            dataRetrasado={dataRetrasado}
            nomeFantasia={nomeFantasia}
            olhoInicial={nomeFantasiaConfig.olhoOperacional}
            colunasDisponiveis={colunasDisponiveis}
            colunasVisiveisIniciais={kpiColunasVisiveis}
          />
        </div>
      </div>
    </PageTransition>
  );
}
