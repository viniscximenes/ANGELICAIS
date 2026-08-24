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
  title: "RV - Atual",
};

function getCurrentMesRef(): string {
  const { year, month } = getDatePartsInBR();
  return `${year}-${String(month).padStart(2, "0")}-01`;
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

export default async function RvAtualPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.profile.role === "GESTOR") redirect("/reports/consolidado");

  const mesRef = getCurrentMesRef();
  const monthLabel = formatMonthLabel(mesRef);

  const calculation = await getRvForOperator(
    user.profile.emailCorporativo,
    mesRef,
    "current",
  );

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="space-y-2">
            <div className="flex items-baseline gap-3">
              <h1 className="ds-h1">RV</h1>
              <span className="ds-mono text-muted-foreground">
                / estimativa · atual
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

          {calculation?.status === "sem_dados" && <RvEmptyState />}

          {calculation?.status === "indisponivel_status" &&
            calculation.motivoIndisponibilidade && (
              <RvIndisponivelCard
                status={calculation.motivoIndisponibilidade.status}
                mensagem={calculation.motivoIndisponibilidade.mensagem}
              />
            )}

          {calculation?.status === "nao_elegivel" && (
            <RvEmptyState
              title="Não elegível para RV este mês"
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
