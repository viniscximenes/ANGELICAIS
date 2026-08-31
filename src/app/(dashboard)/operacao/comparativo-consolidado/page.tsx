import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ComparativoConsolidadoSection } from "@/components/operacional/comparativo-consolidado/comparativo-consolidado-section";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getPostLoginPath } from "@/lib/auth/post-login-path";
import { formatNomeProprio } from "@/lib/gestor/derive-nome-operador";
import { fetchComparativoConsolidadoAction } from "@/lib/retencao/comparativo/actions";

export const metadata: Metadata = {
  title: "Operação - Comparativo Consolidado",
};

// Personalizada por gestor (indicadores do logado no topo) — nunca cacheada.
export const dynamic = "force-dynamic";

export default async function ComparativoConsolidadoPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  // Mesmo gate das demais telas do gestor: só role GESTOR. O ADM tem a
  // permissão view_gestor_panel mas é confinado a /bases e /configuracoes
  // pelo middleware — não precisa (nem deve) ver o comparativo entre pares.
  if (user.profile.role !== "GESTOR") {
    redirect(getPostLoginPath(user.profile.role));
  }

  const result = await fetchComparativoConsolidadoAction();

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-7xl space-y-8">
          <header className="border-border flex flex-col gap-2 border-b border-dashed pb-4">
            <span className="text-muted-foreground text-xs tracking-wide uppercase">
              Painel do Gestor
            </span>
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="ds-h1">Comparativo Consolidado</h1>
              <span className="ds-mono-sm text-muted-foreground">
                / Operação · {formatNomeProprio(user.profile.fullName)}
              </span>
            </div>
          </header>

          {!result.success ? (
            <div className="elevation-1 bg-card border border-border/60 rounded-xl p-8 text-center">
              <p className="ds-body text-danger font-medium">{result.error}</p>
            </div>
          ) : (
            <ComparativoConsolidadoSection
              gestorLogado={result.data.gestorLogado}
              outrosGestores={result.data.outrosGestores}
            />
          )}
        </div>
      </div>
    </PageTransition>
  );
}
