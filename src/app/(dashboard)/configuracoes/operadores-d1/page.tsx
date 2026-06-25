import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OperadoresD1Form } from "@/components/gestor/operadores-d1-form";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getPostLoginPath } from "@/lib/auth/post-login-path";
import { listarOperadoresAction } from "@/lib/google/gestor/operadores-d1/actions";

export const metadata: Metadata = {
  title: "Configurações — Operadores do D-1",
};

export const dynamic = "force-dynamic";

export default async function ConfigOperadoresD1Page() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.profile.role !== "GESTOR") redirect(getPostLoginPath(user.profile.role));

  const result = await listarOperadoresAction();
  const operadores = result.ok ? result.data : [];

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-2xl space-y-8">
          <div className="space-y-1">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="ds-h1">Configurações</h1>
              <span className="ds-mono text-muted-foreground">
                / Operadores do D-1 · {user.profile.fullName}
              </span>
            </div>
            <p className="ds-small text-muted-foreground">
              Gerencie os operadores das guias do D-1. Adicionar escreve o email
              nas duas guias (principal + tempo logado); excluir limpa as colunas
              A e B preservando as fórmulas.
            </p>

            {!result.ok && (
              <p className="mt-2 ds-small text-destructive">
                Não foi possível carregar a lista atual:{" "}
                <span className="font-medium">{result.error}</span>
              </p>
            )}
          </div>

          <OperadoresD1Form operadoresIniciais={operadores} />
        </div>
      </div>
    </PageTransition>
  );
}
