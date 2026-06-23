import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { NomeFantasiaForm } from "@/components/gestor/nome-fantasia-form";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getPostLoginPath } from "@/lib/auth/post-login-path";
import { getNomeFantasiaConfig } from "@/lib/gestor/nome-fantasia/get-config";
import { getOperadoresParaConfig } from "@/lib/gestor/nome-fantasia/get-operadores-para-config";

export const metadata: Metadata = {
  title: "Configurações — Operadores",
};

export const dynamic = "force-dynamic";

export default async function ConfigOperadoresPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  if (user.profile.role !== "GESTOR") {
    redirect(getPostLoginPath(user.profile.role));
  }

  const gestorId = user.profile.id;

  const [config, operadores] = await Promise.all([
    getNomeFantasiaConfig(gestorId),
    getOperadoresParaConfig(user.profile.username, user.profile.emailCorporativo),
  ]);

  const mapaInicial = Object.fromEntries(config.mapa);

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-2xl space-y-8">
          <div className="space-y-1">
            <div className="flex items-baseline gap-3">
              <h1 className="ds-h1">Configurações</h1>
              <span className="ds-mono text-muted-foreground">/ Operadores</span>
            </div>
            <p className="ds-small text-muted-foreground">
              Defina apelidos para os operadores da equipe. Quando ativado,
              substitui os nomes nas tabelas D-1, Tempo Logado e
              Indisponibilidade.
            </p>
          </div>

          <NomeFantasiaForm
            ativoInicial={config.ativo}
            operadores={operadores}
            mapaInicial={mapaInicial}
          />
        </div>
      </div>
    </PageTransition>
  );
}
