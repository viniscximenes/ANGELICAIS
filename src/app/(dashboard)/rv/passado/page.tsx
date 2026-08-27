import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageTransition } from "@/components/motion/page-transition";
import { RvDeflatorsBlock } from "@/components/rv/rv-deflators-block";
import { RvEmptyState } from "@/components/rv/rv-empty-state";
import { RvGainedBlock } from "@/components/rv/rv-gained-block";
import { RvImpossibleBlock } from "@/components/rv/rv-impossible-block";
import { RvIndisponivelCard } from "@/components/rv/rv-indisponivel-card";
import { RvPotentialBlock } from "@/components/rv/rv-potential-block";
import { RvStatusCard } from "@/components/rv/rv-status-card";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getRvForOperator } from "@/lib/rv/get-rv-for-operator";
import { getDatePartsInBR } from "@/lib/utils/format-datetime-br";

export const metadata: Metadata = {
  title: "RV - Passado",
};

function getPreviousMesRef(): string {
  const { year, month } = getDatePartsInBR();

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  return `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
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

export default async function RvPassadoPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.profile.role === "GESTOR") redirect("/reports/consolidado");

  const mesRef = getPreviousMesRef();
  const monthLabel = formatMonthLabel(mesRef);

  const calculation = await getRvForOperator(
    user.profile.emailCorporativo,
    mesRef,
    "previous",
  );

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="space-y-2">
            <div className="flex items-baseline gap-3">
              <h1 className="ds-h1">RV</h1>
              <span className="ds-mono text-muted-foreground">
                / estimativa · passado
              </span>
            </div>
            <p className="ds-mono-sm text-muted-foreground">{monthLabel}</p>
          </div>

          {!calculation && (
            <RvEmptyState
              title="Erro ao calcular RV"
              description="Tente recarregar a página. Se persistir, contate o administrador."
            />
          )}

          {calculation?.status === "sem_dados" && (
            <RvEmptyState
              title="Sem dados do mês passado"
              description={`Não há registro de KPI para ${monthLabel} no seu histórico, ou as regras do mês passado ainda não foram definidas pelo administrador.`}
            />
          )}

          {calculation?.status === "indisponivel_status" &&
            calculation.motivoIndisponibilidade && (
              <RvIndisponivelCard
                status={calculation.motivoIndisponibilidade.status}
                mensagem={calculation.motivoIndisponibilidade.mensagem}
              />
            )}

          {calculation?.status === "nao_elegivel" && (
            <RvEmptyState
              title="Não elegível para RV no mês passado"
              description={
                calculation.motivoNaoElegivel ??
                "Você não atendeu uma das regras de elegibilidade."
              }
            />
          )}

          {calculation?.status === "ok" && (
            <div className="space-y-5">
              <RvStatusCard calculation={calculation} />
              <RvGainedBlock calculation={calculation} />
              <RvDeflatorsBlock calculation={calculation} />
              <RvPotentialBlock calculation={calculation} />
              <RvImpossibleBlock calculation={calculation} />
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
