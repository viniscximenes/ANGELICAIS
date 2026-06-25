import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { GestorContratosSection } from "@/components/gestor/gestor-contratos-section";
import { GestorEquipeSection } from "@/components/gestor/gestor-equipe-section";
import { GestorMotivosSection } from "@/components/gestor/gestor-motivos-section";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { getPostLoginPath } from "@/lib/auth/post-login-path";
import { formatNomeProprio } from "@/lib/gestor/derive-nome-operador";
import { getNomeFantasiaConfig } from "@/lib/gestor/nome-fantasia/get-config";
import { resolverNomeExibicao } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import type { OperadorConsolidado, ResumoEquipe } from "@/lib/google/d1";
import { fetchUltimoReportHora } from "@/lib/google/d1/upload";
import { fetchGestorData, resolveGuiaGestor } from "@/lib/google/gestor";

export const metadata: Metadata = {
  title: "Consolidado — D-1 ALLOHA FIBRA",
};

export const revalidate = 300;

export default async function GestorD1Page() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Gate explícito por role: só GESTOR acessa esta tela. O ADM mantém a
  // permissão view_gestor_panel, mas é redirecionado aqui (não é gestor).
  if (user.profile.role !== "GESTOR") {
    redirect(getPostLoginPath(user.profile.role));
  }

  // Resolve a guia do gestor logado (Fase 1: mapa fixo por login/email).
  const guia =
    resolveGuiaGestor(user.profile.username) ??
    resolveGuiaGestor(user.profile.emailCorporativo);

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

  const [data, horaReport, nomeFantasiaConfig] = await Promise.all([
    fetchGestorData(guia),
    fetchUltimoReportHora(), // hora do report (BASE - 1!S2), para o export
    getNomeFantasiaConfig(user.profile.id),
  ]);

  const nomeFantasia = {
    ativo: nomeFantasiaConfig.ativo,
    mapa: Object.fromEntries(nomeFantasiaConfig.mapa),
  };

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

  const showUpload = can(user.profile.role, "manage_d1_base");

  // Converte para o formato que a EquipeTable do D-1 já aceita.
  const operadores: OperadorConsolidado[] = data.operadores.map((op) => ({
    email: resolverNomeExibicao(op.nome.trim().toLowerCase(), nomeFantasia),
    emailOriginal: op.nome.trim().toLowerCase(),
    supervisor: op.gestora,
    retidos: op.retidos,
    cancelados: op.cancelados,
    pedidos: op.pedidos,
    txRetencao: op.txRetencao,
  }));

  const equipe: ResumoEquipe = {
    retidos: data.consolidado.retidos,
    cancelados: data.consolidado.cancelados,
    pedidos: data.consolidado.pedidos,
    txRetencao: data.consolidado.txRetencao,
    horaReport: horaReport ?? "—",
  };

  const gestora = data.consolidado.gestora
    ? formatNomeProprio(data.consolidado.gestora)
    : "Equipe";

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-7xl space-y-8">
          <header className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="ds-h1">Consolidado</h1>
              <span className="ds-mono-sm text-muted-foreground">
                / D-1 · {gestora}
              </span>
            </div>
          </header>

          <div className="space-y-12">
            <GestorEquipeSection
              operadores={operadores}
              equipe={equipe}
              gestora={gestora}
              showUpload={showUpload}
            />
            <GestorMotivosSection
              txPorMotivo={data.txPorMotivo}
              operadores={data.operadores}
            />
            <GestorContratosSection
              contratosRetidos={data.contratosRetidos}
              contratosCancelados={data.contratosCancelados}
            />
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
