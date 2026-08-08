import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { GestorTempoLogadoIndispSection } from "@/components/gestor/gestor-tempo-logado-indisp-section";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { getPostLoginPath } from "@/lib/auth/post-login-path";
import { getGestorIndisponibilidade } from "@/lib/d1-db/get-gestor-indisponibilidade";
import { getGestorTempoLogado } from "@/lib/d1-db/get-gestor-tempo-logado";
import { formatNomeProprio } from "@/lib/gestor/derive-nome-operador";
import { getNomeFantasiaConfig } from "@/lib/gestor/nome-fantasia/get-config";

export const metadata: Metadata = {
  title: "Tempo Logado & Indisponibilidade — Reports ALLOHA FIBRA",
};

export const revalidate = 300;

export default async function ReportsTempoIndisponibilidadePage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  if (user.profile.role !== "GESTOR") {
    redirect(getPostLoginPath(user.profile.role));
  }

  const [dataTempoLogado, dataIndisponibilidade, nomeFantasiaConfig] =
    await Promise.all([
      getGestorTempoLogado(user.profile.id),
      getGestorIndisponibilidade(user.profile.id),
      getNomeFantasiaConfig(user.profile.id),
    ]);

  // Os dois datasets vêm do mesmo upload de BASE - 2 — se um vier vazio,
  // tratamos como falha (evita renderizar a página pela metade).
  if (
    dataTempoLogado.operadores.length === 0 ||
    dataIndisponibilidade.operadores.length === 0
  ) {
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
              Verifique se há operadores cadastrados na sua equipe (Configurações
              &rarr; Operadores do D-1) e se a base do dia já foi atualizada.
            </span>
          </div>
        </div>
      </PageTransition>
    );
  }

  const nomeGestora = dataTempoLogado.operadores.find((op) => op.gestor)?.gestor ?? "";
  const gestora = nomeGestora ? formatNomeProprio(nomeGestora) : "Equipe";

  const showUpload = can(user.profile.role, "manage_d1_base");

  const nomeFantasia = {
    ativo: nomeFantasiaConfig.ativo,
    mapa: Object.fromEntries(nomeFantasiaConfig.mapa),
  };

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
              <h1 className="ds-h1">Tempo Logado & Indisponibilidade</h1>
              <span className="ds-mono-sm text-muted-foreground">
                / Reports · {gestora}
              </span>
            </div>
          </header>

          <GestorTempoLogadoIndispSection
            operadoresTempoLogado={dataTempoLogado.operadores}
            operadoresIndisponibilidade={dataIndisponibilidade.operadores}
            horaReport={dataTempoLogado.horaReport ?? "—"}
            nomeSupervisorReport={dataTempoLogado.nomeSupervisorReport}
            showUpload={showUpload}
            nomeFantasia={nomeFantasia}
            olhoInicialTempoLogado={nomeFantasiaConfig.olhoTempoLogado}
            olhoInicialIndisponibilidade={nomeFantasiaConfig.olhoIndisponibilidade}
          />
        </div>
      </div>
    </PageTransition>
  );
}
