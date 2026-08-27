import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageTransition } from "@/components/motion/page-transition";
import { DiarioMonthTabs } from "@/components/registros/diario/diario-month-tabs";
import { DiarioOperatorsList } from "@/components/registros/diario/diario-operators-list";
import { DiarioPageActions } from "@/components/registros/diario/diario-page-actions";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { getOperatorsWithCounts } from "@/lib/diario/get-operators-with-counts";
import { getAllOperatorsNoGestor } from "@/lib/monitorias/get-all-operators-no-gestor";

export const metadata: Metadata = {
  title: "Diário de Bordo — ANGELICAIS",
};

function getCurrentMesRef(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}`;
}

interface Props {
  searchParams: Promise<{ month?: string }>;
}

export default async function DiarioPage({ searchParams }: Props) {
  const params = await searchParams;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!can(user.profile.role, "view_monitoria")) {
    redirect("/d-1");
  }

  const isAdm = can(user.profile.role, "manage_system", user.profile.isAdminSkill);
  const currentMonth = params.month ?? getCurrentMesRef();

  if (!/^\d{4}-\d{2}$/.test(currentMonth)) {
    redirect("/registros/diario");
  }

  const operatorsWithCounts = await getOperatorsWithCounts(currentMonth);

  const visibleOperators = operatorsWithCounts;

  const operatorsForModal = isAdm ? await getAllOperatorsNoGestor() : [];

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-baseline gap-3">
                <h1 className="ds-h1">Registros</h1>
                <span className="ds-mono text-muted-foreground">
                  / diário de bordo
                </span>
              </div>
              <p className="ds-small text-muted-foreground">
                {isAdm
                  ? "Registre ocorrências dos operadores ao longo do mês."
                  : "Seus registros de ocorrências do mês."}
              </p>
            </div>

            {isAdm && <DiarioPageActions operators={operatorsForModal} />}
          </div>

          <DiarioMonthTabs currentMonth={currentMonth} />

          <DiarioOperatorsList
            operators={visibleOperators}
            currentMonth={currentMonth}
          />
        </div>
      </div>
    </PageTransition>
  );
}
