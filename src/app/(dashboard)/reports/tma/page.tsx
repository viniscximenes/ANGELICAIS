import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageTransition } from "@/components/motion/page-transition";
import { GestorTmaSection } from "@/components/tma/gestor-tma-section";
import type { TmaLinha } from "@/components/tma/tma-table";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { getPostLoginPath } from "@/lib/auth/post-login-path";
import { resolverNomeExibicao } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import { getNomeFantasiaConfig } from "@/lib/gestor/nome-fantasia/get-config";
import { getGestorTma } from "@/lib/tma/get-gestor-tma";
import { getGestorTmaAtendimentos } from "@/lib/tma/get-gestor-tma-atendimentos";

export const metadata: Metadata = {
  title: "Reports - TMA",
};

export const revalidate = 300;

export default async function ReportsTmaPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Gate explícito por role: só GESTOR acessa esta tela (com ou sem
  // is_admin_skill — a role continua "GESTOR"). O ADM puro é redirecionado
  // aqui e, de qualquer forma, o middleware já o confina a /bases e
  // /configuracoes antes de chegar nesta rota.
  if (user.profile.role !== "GESTOR") {
    redirect(getPostLoginPath(user.profile.role));
  }

  const [{ operadores, reportHora, reportNomeSupervisor, metaAtualMmSs }, nomeFantasiaConfig, atendimentosPorOperador] =
    await Promise.all([
      getGestorTma(user.profile.id),
      getNomeFantasiaConfig(user.profile.id),
      getGestorTmaAtendimentos(user.profile.id),
    ]);

  const nomeFantasia = {
    ativo: nomeFantasiaConfig.ativo,
    mapa: Object.fromEntries(nomeFantasiaConfig.mapa),
  };

  const linhas: TmaLinha[] = operadores.map((op) => ({
    ...op,
    nomeExibicao: resolverNomeExibicao(op.operatorEmail, nomeFantasia),
  }));

  const showUpload = can(user.profile.role, "manage_d1_base");

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-7xl">
          <header className="border-border flex flex-col gap-2 border-b border-dashed pb-4">
            <span className="text-muted-foreground text-xs tracking-wide uppercase">
              Painel do Gestor
            </span>
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="ds-h1 font-bold">TMA</h1>
              <span className="ds-mono-sm text-muted-foreground">/ Reports</span>
            </div>
          </header>

          <GestorTmaSection
            linhas={linhas}
            atendimentosPorOperador={Object.fromEntries(atendimentosPorOperador)}
            reportHora={reportHora ?? "—"}
            reportNomeSupervisor={reportNomeSupervisor}
            metaAtualMmSs={metaAtualMmSs}
            showUpload={showUpload}
            nomeFantasia={nomeFantasia}
            olhoInicial={nomeFantasiaConfig.olhoTma}
          />
        </div>
      </div>
    </PageTransition>
  );
}
