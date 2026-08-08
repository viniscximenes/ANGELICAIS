import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DiarioDeBordoClient } from "@/components/db/gestor/diario-de-bordo-client";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getPostLoginPath } from "@/lib/auth/post-login-path";
import { getDiasComRegistrosAction } from "@/lib/db/actions/get-dias-com-registros-action";
import { getTemasAction } from "@/lib/db/actions/get-temas-action";

export const metadata: Metadata = {
  title: "Diário de Bordo — ANGELICAIS",
};

export default async function GestorDbPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Gate explícito por role: só GESTOR acessa esta tela.
  if (user.profile.role !== "GESTOR") {
    redirect(getPostLoginPath(user.profile.role));
  }

  const [dias, temasPausa, temasTempoLogado] = await Promise.all([
    getDiasComRegistrosAction(),
    getTemasAction("pausa"),
    getTemasAction("tempo_logado"),
  ]);

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="space-y-1">
            <h1 className="ds-h1">Diário de Bordo</h1>
            <p className="ds-small text-muted-foreground">
              Selecione o dia, escolha o tema de cada registro detectado e
              gere o texto padronizado pra colar na planilha.
            </p>
          </div>

          <DiarioDeBordoClient
            dias={dias}
            temasPausa={temasPausa}
            temasTempoLogado={temasTempoLogado}
          />
        </div>
      </div>
    </PageTransition>
  );
}
