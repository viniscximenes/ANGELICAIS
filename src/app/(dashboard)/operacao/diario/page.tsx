import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DiarioSection } from "@/components/equipe/diario/diario-section";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getPostLoginPath } from "@/lib/auth/post-login-path";
import { getJustificativasPadrao } from "@/lib/equipe/diario/get-justificativas-padrao";
import { formatNomeProprio } from "@/lib/gestor/derive-nome-operador";
import { getEquipeAction } from "@/lib/gestor/equipe/actions";

export const metadata: Metadata = {
  title: "Operação - Diário",
};

export const dynamic = "force-dynamic";

export default async function OperacaoDiarioPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Gate explícito por role: só GESTOR acessa esta tela (mesmo escopo de
  // "MEUS RESULTADOS" / Reports).
  if (user.profile.role !== "GESTOR") {
    redirect(getPostLoginPath(user.profile.role));
  }

  // Única leitura no Supabase: o roster do gestor (mesma fonte de
  // /configuracoes/equipe). Só serve para filtrar quais operadores podem
  // aparecer no relatório — nada é gravado.
  const [roster, justificativasPadrao] = await Promise.all([
    getEquipeAction(),
    getJustificativasPadrao(),
  ]);
  const operadoresValidos = roster.ok
    ? roster.data.operadores.map((o) => o.email.split("@")[0])
    : [];

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-7xl">
          <header className="border-border flex flex-col gap-2 border-b border-dashed pb-4">
            <span className="text-muted-foreground text-xs tracking-wide uppercase">
              PAINEL GESTOR
            </span>
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="ds-h1 font-bold">Diário</h1>
              <span className="ds-mono-sm text-muted-foreground">
                / Operação · {formatNomeProprio(user.profile.fullName)}
              </span>
            </div>
          </header>

          <DiarioSection
            operadoresValidos={operadoresValidos}
            rosterErro={roster.ok ? null : roster.error}
            justificativasPadrao={justificativasPadrao}
          />
        </div>
      </div>
    </PageTransition>
  );
}
