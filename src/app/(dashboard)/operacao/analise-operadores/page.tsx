import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AnaliseOperadoresSection } from "@/components/operacional/analise-operadores/analise-operadores-section";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getPostLoginPath } from "@/lib/auth/post-login-path";
import { getRosterOperadoresGestor } from "@/lib/d1-db/get-roster-gestor";
import {
  deriveNomeOperador,
  formatNomeProprio,
} from "@/lib/gestor/derive-nome-operador";
import { getSnapshotsSummary } from "@/lib/kpi/bases/get-snapshots-summary";

export const metadata: Metadata = {
  title: "Análise de Operadores",
};

// Página personalizada por gestor — nunca cacheada entre usuários.
export const dynamic = "force-dynamic";

export default async function AnaliseOperadoresPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  if (user.profile.role !== "GESTOR") {
    redirect(getPostLoginPath(user.profile.role));
  }

  const [roster, snapshotsSummary] = await Promise.all([
    getRosterOperadoresGestor(user.profile.id),
    getSnapshotsSummary(),
  ]);

  // Operadores selecionáveis = EXATAMENTE o roster de /configuracoes/equipe.
  // Rótulo = "nome.sobrenome" da parte local do e-mail (deriveNomeOperador).
  // Esta página NÃO usa nome fantasia (o roster é 100% nome.sobrenome@alloha.com).
  const operadores = roster
    .map((email) => ({
      email,
      nome: deriveNomeOperador(email),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const mesMaisRecenteDisponivel = snapshotsSummary[0]?.mesRef ?? null;

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
              <h1 className="ds-h1">Análise de Operadores</h1>
              <span className="ds-mono-sm text-muted-foreground">
                / Operação · {formatNomeProprio(user.profile.fullName)}
              </span>
            </div>
          </header>

          <AnaliseOperadoresSection
            operadores={operadores}
            mesMaisRecenteDisponivel={mesMaisRecenteDisponivel}
            gestorNome={formatNomeProprio(user.profile.fullName)}
          />
        </div>
      </div>
    </PageTransition>
  );
}
