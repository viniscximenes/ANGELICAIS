import type { Metadata } from "next";
import { IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageTransition } from "@/components/motion/page-transition";
import { FinalizedBanner } from "@/components/registros/monitoria/finalized-banner";
import { MonitoriaForm } from "@/components/registros/monitoria/monitoria-form";
import { MonitoriaPlayerCard } from "@/components/registros/monitoria/monitoria-player-card";
import { MonitoriaReview } from "@/components/registros/monitoria/monitoria-review";
import { MonitoriaStatusBadge } from "@/components/registros/monitoria/monitoria-status-badge";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { getMonitoriaById } from "@/lib/monitorias/get-monitoria-by-id";

export const metadata: Metadata = {
  title: "Monitoria — Detalhe — ANGELICAIS",
};

function formatDateBR(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MonitoriaDetailPage({ params }: Props) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!can(user.profile.role, "view_monitoria")) {
    redirect("/d-1");
  }

  const monitoria = await getMonitoriaById(id);
  if (!monitoria) notFound();

  const isAdm = can(user.profile.role, "manage_system", user.profile.isAdminSkill);
  const isAux = user.profile.role === "AUX";
  const isResponsible =
    monitoria.auxResponsibleEmail.toLowerCase() ===
    user.profile.emailCorporativo.toLowerCase();

  if (!isAdm && !isResponsible) {
    redirect("/registros/monitoria");
  }

  const isPending = monitoria.status === "pending";
  const isFinalized = monitoria.status === "finalized";
  const isSent = monitoria.status === "sent";

  const showForm = isPending;
  const showReview = isFinalized || isSent;

  const canFinalize = isAux && isResponsible && isPending;
  const canSend = isAdm && isFinalized;

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-3xl space-y-6">
          <Link
            href="/registros/monitoria"
            className="ds-mono-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
          >
            <IconArrowLeft size={14} aria-hidden="true" />
            Voltar para lista
          </Link>

          <div className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div className="flex items-baseline gap-3">
                <h1 className="ds-h1">Monitoria</h1>
                <span className="ds-mono text-muted-foreground">
                  / {formatDateBR(monitoria.dataAtendimento)}
                </span>
              </div>
              <MonitoriaStatusBadge status={monitoria.status} />
            </div>

            <div className="ds-mono-sm text-muted-foreground space-y-0.5">
              <p>
                <span className="text-foreground">Operador:</span>{" "}
                {monitoria.operatorName ?? monitoria.operatorEmail}
              </p>
              <p>
                <span className="text-foreground">AUX responsável:</span>{" "}
                {monitoria.auxResponsibleName ?? monitoria.auxResponsibleEmail}
              </p>
              <p>
                ID Chamada: {monitoria.idChamada} · Contrato:{" "}
                {monitoria.contratoCliente}
              </p>
            </div>
          </div>

          {monitoria.status === "finalized" && monitoria.finalizedAt && (
            <FinalizedBanner finalizedAt={monitoria.finalizedAt} />
          )}

          <MonitoriaPlayerCard
            link={monitoria.linkOnedrive}
            idChamada={monitoria.idChamada}
          />

          <div className="elevation-1 rounded-xl p-6 lg:p-8">
            {showForm && (
              <MonitoriaForm
                monitoria={monitoria}
                canFinalize={canFinalize}
                readonly={false}
              />
            )}
            {showReview && (
              <MonitoriaReview monitoria={monitoria} canSend={canSend} />
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
