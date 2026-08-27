import type { Metadata } from "next";
import { IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageTransition } from "@/components/motion/page-transition";
import { DiarioMonthTabs } from "@/components/registros/diario/diario-month-tabs";
import { DiarioRecordsList } from "@/components/registros/diario/diario-records-list";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { getDiarioForOperator } from "@/lib/diario/get-diario-for-operator";
import { getAllOperatorsNoGestor } from "@/lib/monitorias/get-all-operators-no-gestor";

export const metadata: Metadata = {
  title: "Diário do operador — ANGELICAIS",
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

function formatMonthLabel(mesRef: string): string {
  const [year, month] = mesRef.split("-");
  const meses = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  return `${meses[parseInt(month) - 1]} ${year}`;
}

interface Props {
  params: Promise<{ operator_email: string }>;
  searchParams: Promise<{ month?: string }>;
}

export default async function DiarioOperatorPage({
  params,
  searchParams,
}: Props) {
  const { operator_email: operatorEmailParam } = await params;
  const { month } = await searchParams;

  const operatorEmail = decodeURIComponent(operatorEmailParam);

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!can(user.profile.role, "view_monitoria")) {
    redirect("/d-1");
  }

  const isAdm = can(user.profile.role, "manage_system", user.profile.isAdminSkill);

  const currentMonth = month ?? getCurrentMesRef();
  if (!/^\d{4}-\d{2}$/.test(currentMonth)) {
    redirect(`/registros/diario/${operatorEmailParam}`);
  }

  const registros = await getDiarioForOperator(operatorEmail, currentMonth);
  const operatorName = registros[0]?.operatorName ?? null;

  const operatorsForModal = isAdm ? await getAllOperatorsNoGestor() : [];

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-4xl space-y-6">
          <Link
            href={`/registros/diario?month=${currentMonth}`}
            className="ds-mono-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
          >
            <IconArrowLeft size={14} aria-hidden="true" />
            Voltar para lista
          </Link>

          <div className="space-y-1">
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="ds-h1">Diário</h1>
              <span className="ds-mono text-muted-foreground">
                / {operatorName ?? operatorEmail}
              </span>
            </div>
            <p className="ds-mono-sm text-muted-foreground">
              {operatorEmail} · {formatMonthLabel(currentMonth)}
            </p>
          </div>

          <DiarioMonthTabs currentMonth={currentMonth} />

          <DiarioRecordsList
            registros={registros}
            canEdit={isAdm}
            operators={operatorsForModal}
          />
        </div>
      </div>
    </PageTransition>
  );
}
