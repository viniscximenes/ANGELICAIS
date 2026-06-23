import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { GestorIndisponibilidadeSection } from "@/components/gestor/gestor-indisponibilidade-section";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getPostLoginPath } from "@/lib/auth/post-login-path";
import { formatNomeProprio } from "@/lib/gestor/derive-nome-operador";
import { getNomeFantasiaConfig } from "@/lib/gestor/nome-fantasia/get-config";
import {
  fetchGestorIndisponibilidade,
  resolveGuiaTempoLogado,
} from "@/lib/google/gestor";

export const metadata: Metadata = {
  title: "Indisponibilidade — D-1 ALLOHA FIBRA",
};

export const revalidate = 300;

export default async function GestorIndisponibilidadePage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  if (user.profile.role !== "GESTOR") {
    redirect(getPostLoginPath(user.profile.role));
  }

  const guia =
    resolveGuiaTempoLogado(user.profile.username) ??
    resolveGuiaTempoLogado(user.profile.emailCorporativo);

  if (!guia) {
    return (
      <PageTransition>
        <div className="flex min-h-[60vh] items-center justify-center px-6">
          <div
            className="elevation-1 ds-body text-muted-foreground max-w-md rounded-xl px-6 py-10 text-center"
            style={{ border: "1px solid var(--border)" }}
          >
            Nenhuma equipe vinculada ao seu usuário.
          </div>
        </div>
      </PageTransition>
    );
  }

  const [data, nomeFantasiaConfig] = await Promise.all([
    fetchGestorIndisponibilidade(guia),
    getNomeFantasiaConfig(user.profile.id),
  ]);

  if (data.operadores.length === 0) {
    return (
      <PageTransition>
        <div className="flex min-h-[60vh] items-center justify-center px-6">
          <div
            className="elevation-1 ds-body text-muted-foreground max-w-md rounded-xl px-6 py-10 text-center"
            style={{ border: "1px solid var(--border)" }}
          >
            Não foi possível carregar os dados da equipe.
            <br />
            <span className="ds-mono-sm" style={{ color: "var(--muted-foreground)" }}>
              Verifique se a guia &ldquo;{guia}&rdquo; existe na planilha.
            </span>
          </div>
        </div>
      </PageTransition>
    );
  }

  const nomeSupervisor = data.operadores.find((op) => op.gestor)?.gestor ?? "";
  const nomeGestora = nomeSupervisor ? formatNomeProprio(nomeSupervisor) : "Equipe";

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-7xl space-y-8">
          <header className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="ds-h1">Indisponibilidade</h1>
              <span className="ds-mono-sm text-muted-foreground">
                / D-1 · {nomeGestora}
              </span>
            </div>
          </header>

          <GestorIndisponibilidadeSection
            operadores={data.operadores}
            horaReport={data.horaReport ?? "—"}
            nomeFantasia={{
              ativo: nomeFantasiaConfig.ativo,
              mapa: Object.fromEntries(nomeFantasiaConfig.mapa),
            }}
          />
        </div>
      </div>
    </PageTransition>
  );
}
