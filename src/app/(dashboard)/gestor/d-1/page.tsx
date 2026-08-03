import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { GestorEquipeSection } from "@/components/gestor/gestor-equipe-section";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { getPostLoginPath } from "@/lib/auth/post-login-path";
import { getConfigTabela } from "@/lib/gestor/config-tabela/get-config-tabela";
import { formatNomeProprio } from "@/lib/gestor/derive-nome-operador";
import { getNomeFantasiaConfig } from "@/lib/gestor/nome-fantasia/get-config";
import { resolverNomeExibicao } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import type { OperadorConsolidado, ResumoEquipe } from "@/lib/google/d1";
import { fetchUltimoReportInfo } from "@/lib/google/d1/upload";
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

  const [data, reportInfo, nomeFantasiaConfig, configTabela] = await Promise.all([
    fetchGestorData(guia),
    fetchUltimoReportInfo(), // hora + nome (BASE - 1!S2), para o export
    getNomeFantasiaConfig(user.profile.id),
    getConfigTabela(user.profile.id),
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
    horaReport: reportInfo.hora ?? "—",
  };

  const gestora = data.consolidado.gestora
    ? formatNomeProprio(data.consolidado.gestora)
    : "Equipe";

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
              <h1 className="ds-h1">Consolidado</h1>
              <span className="ds-mono-sm text-muted-foreground">
                / D-1 · {gestora}
              </span>
            </div>
          </header>

          <GestorEquipeSection
            operadores={operadores}
            equipe={equipe}
            gestora={gestora}
            showUpload={showUpload}
            nomeFantasia={nomeFantasia}
            olhoInicial={nomeFantasiaConfig.olhoConsolidado}
            nomeSupervisorReport={reportInfo.nomeSupervisor}
            metaTxInicial={configTabela.metaTxRetencao}
            ordemTabelaInicial={configTabela.ordemTabela}
          />
        </div>
      </div>
    </PageTransition>
  );
}
