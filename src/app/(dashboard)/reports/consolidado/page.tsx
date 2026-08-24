import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { GestorEquipeSection } from "@/components/gestor/gestor-equipe-section";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { getPostLoginPath } from "@/lib/auth/post-login-path";
import { getGestorConsolidado } from "@/lib/d1-db/get-gestor-consolidado";
import type { OperadorConsolidado, ResumoEquipe } from "@/lib/d1-db/types";
import { getConfigTabela } from "@/lib/gestor/config-tabela/get-config-tabela";
import { formatNomeProprio } from "@/lib/gestor/derive-nome-operador";
import { getNomeFantasiaConfig } from "@/lib/gestor/nome-fantasia/get-config";
import { resolverNomeExibicao } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import { aplicarRvDiarioNaEquipe } from "@/lib/rv/calculate-rv-diario";
import { getCurrentPerUnitFaixas } from "@/lib/rv/get-current-per-unit-faixas";

export const metadata: Metadata = {
  title: "Reports - Consolidado",
};

export const revalidate = 300;

export default async function ReportsConsolidadoPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Gate explícito por role: só GESTOR acessa esta tela. O ADM mantém a
  // permissão view_gestor_panel, mas é redirecionado aqui (não é gestor).
  if (user.profile.role !== "GESTOR") {
    redirect(getPostLoginPath(user.profile.role));
  }

  const [{ data, reportHora, reportNomeSupervisor }, nomeFantasiaConfig, configTabela, rvFaixas] =
    await Promise.all([
      getGestorConsolidado(user.profile.id),
      getNomeFantasiaConfig(user.profile.id),
      getConfigTabela(user.profile.id),
      getCurrentPerUnitFaixas(),
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
              Verifique se há operadores cadastrados na sua equipe (Configurações
              &rarr; Operadores do D-1) e se a base do dia já foi atualizada.
            </span>
          </div>
        </div>
      </PageTransition>
    );
  }

  const showUpload = can(user.profile.role, "manage_d1_base");

  // Converte para o formato que a EquipeTable do D-1 já aceita.
  const operadoresSemRv: OperadorConsolidado[] = data.operadores.map((op) => ({
    email: resolverNomeExibicao(op.nome.trim().toLowerCase(), nomeFantasia),
    emailOriginal: op.nome.trim().toLowerCase(),
    supervisor: op.gestora,
    retidos: op.retidos,
    cancelados: op.cancelados,
    pedidos: op.pedidos,
    txRetencao: op.txRetencao,
  }));

  const { operadores, rvDiarioEquipe } = aplicarRvDiarioNaEquipe(operadoresSemRv, rvFaixas);

  const equipe: ResumoEquipe = {
    retidos: data.consolidado.retidos,
    cancelados: data.consolidado.cancelados,
    pedidos: data.consolidado.pedidos,
    txRetencao: data.consolidado.txRetencao,
    horaReport: reportHora ?? "—",
    rvDiario: rvDiarioEquipe,
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
              <h1 className="ds-h1 font-bold">Consolidado</h1>
              <span className="ds-mono-sm text-muted-foreground">
                / Reports · {gestora}
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
            nomeSupervisorReport={reportNomeSupervisor}
            metaTxInicial={configTabela.metaTxRetencao}
            ordemTabelaInicial={configTabela.ordemTabela}
            showRvDiarioInicial={configTabela.showRvDiario}
          />
        </div>
      </div>
    </PageTransition>
  );
}
