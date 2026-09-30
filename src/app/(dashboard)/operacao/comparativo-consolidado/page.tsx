import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import { redirect } from "next/navigation";

import "./operacao-comparativo-consolidado.css";
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

// Fonte do tema Zen Linen — carregada só nesta rota, mesmo padrão de
// /s/reports/consolidado e /operacao/diario (ver comentário completo em
// reports-consolidado.css).
const zenSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--font-zen-sans",
});

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
  const nomeGestor = formatNomeProprio(user.profile.fullName);

  return (
    <PageTransition>
      <div
        data-page="operacao-comparativo-consolidado"
        className={`min-h-screen px-6 py-8 lg:px-12 lg:py-12 ${zenSans.variable}`}
      >
        <div className="mx-auto max-w-7xl space-y-4">
          {/*
            Cabeçalho (título + subtítulo) usando EXATAMENTE as mesmas
            classes/estrutura de GestorEquipeSection em /s/reports/consolidado
            (título "Consolidado" + linha de report), pra manter título e
            subtítulo na mesma posição nas duas rotas: mesmo wrapper "pt-4
            mb-4" acima do <h1>, mesmo breakpoint (md, não sm) pro tamanho de
            fonte, e o subtítulo na própria linha "pb-2" (sem mt- própria,
            só o mb-4 do wrapper do título separando os dois), seguido do
            mesmo gap (space-y-4, no lugar do space-y-8 anterior) até o
            conteúdo abaixo — mesma distância que o motion.section space-y-4
            de GestorEquipeSection usa entre o cabeçalho e a tabela.
          */}
          <div>
            <div className="pt-4 mb-4">
              <h1 className="font-sans text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                Comparativo Consolidado
              </h1>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-2">
              <p className="font-sans text-muted-foreground text-sm font-normal">{nomeGestor}</p>
            </div>
          </div>

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
