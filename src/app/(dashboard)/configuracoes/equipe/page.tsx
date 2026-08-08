import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { EquipeConfig } from "@/components/gestor/equipe-config";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getPostLoginPath } from "@/lib/auth/post-login-path";
import { formatNomeProprio } from "@/lib/gestor/derive-nome-operador";
import { getEquipeAction } from "@/lib/gestor/equipe/actions";

export const metadata: Metadata = {
  title: "Equipe — Configurações ALLOHA FIBRA",
};

export const dynamic = "force-dynamic";

/**
 * Unifica as duas telas antigas (/configuracoes/operadores-d1, que fazia o
 * CRUD do roster, e /configuracoes/operadores, que definia os apelidos).
 * As duas liam a mesma tabela por caminhos diferentes; aqui é uma lista só.
 */
export default async function ConfigEquipePage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.profile.role !== "GESTOR") {
    redirect(getPostLoginPath(user.profile.role));
  }

  const result = await getEquipeAction();

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-2xl space-y-6">
          <header className="border-border flex flex-col gap-2 border-b border-dashed pb-4">
            <span className="text-muted-foreground text-xs tracking-wide uppercase">
              Painel do Gestor
            </span>
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="ds-h1">Equipe</h1>
              <span className="ds-mono-sm text-muted-foreground">
                / Configurações · {formatNomeProprio(user.profile.fullName)}
              </span>
            </div>

            {!result.ok && (
              <p className="ds-small text-destructive mt-1">
                Não foi possível carregar a equipe:{" "}
                <span className="font-medium">{result.error}</span>
              </p>
            )}
          </header>

          <EquipeConfig
            ativoInicial={result.ok ? result.data.ativo : false}
            operadoresIniciais={result.ok ? result.data.operadores : []}
          />

          <p className="ds-small text-muted-foreground">
            Só operadores cadastrados aqui aparecem nas tabelas de Consolidado,
            Tempo Logado, Indisponibilidade e KPI da sua equipe. Remover um
            operador também apaga o apelido dele.
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
