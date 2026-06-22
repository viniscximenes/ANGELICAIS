import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageTransition } from "@/components/motion/page-transition";
import { KpiEquipeSection } from "@/components/operacional/kpi-equipe-section";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getPostLoginPath } from "@/lib/auth/post-login-path";
import { formatNomeProprio } from "@/lib/gestor/derive-nome-operador";
import { getKpiDefinitions } from "@/lib/kpi/get-definitions";
import { getKpiEquipePorEmails } from "@/lib/kpi/gestor/get-kpi-equipe-gestor";
import { getOperadoresDoGestor } from "@/lib/kpi/gestor/get-operadores-do-gestor";
import { toKpiEquipeSerial } from "@/lib/kpi/gestor/serial-types";
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

  // Equipe fixada pelo mês atual; definitions em paralelo (sem redundância).
  const [emailsEquipe, definitions] = await Promise.all([
    getOperadoresDoGestor(fullName, mesAtual),
    getKpiDefinitions(),
  ]);

  // KPIs dos mesmos operadores nos 3 meses, em paralelo.
  const [dataAtualRaw, dataPassadoRaw, dataRetrasadoRaw] = await Promise.all([
    getKpiEquipePorEmails(emailsEquipe, definitions, mesAtual, false),
    getKpiEquipePorEmails(emailsEquipe, definitions, mesPassado, true),
    getKpiEquipePorEmails(emailsEquipe, definitions, mesRetrasado, true),
  ]);

  const dataAtual = toKpiEquipeSerial(dataAtualRaw, definitions);
  const dataPassado = toKpiEquipeSerial(dataPassadoRaw, definitions);
  const dataRetrasado = toKpiEquipeSerial(dataRetrasadoRaw, definitions);

  const nomeGestora = formatNomeProprio(fullName);

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-7xl space-y-8">
          <header className="flex flex-wrap items-baseline gap-3">
            <h1 className="ds-h1">KPI</h1>
            <span className="ds-mono-sm text-muted-foreground">
              / Operacional · {nomeGestora}
            </span>
          </header>

          <KpiEquipeSection
            dataAtual={dataAtual}
            dataPassado={dataPassado}
            dataRetrasado={dataRetrasado}
          />
        </div>
      </div>
    </PageTransition>
  );
}
