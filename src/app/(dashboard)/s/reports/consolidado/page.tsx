import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Instrument_Sans } from "next/font/google";

import "./reports-consolidado.css";
import { GestorEquipeSection } from "@/components/gestor/gestor-equipe-section";
import { RetencaoDetalheSection } from "@/components/dashboard/retencao/retencao-detalhe-section";
import { ConsolidadoNavSidebar } from "@/components/gestor/consolidado-nav-sidebar";
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
import { getEmailsEquipe } from "@/lib/retencao/get-emails-equipe";

export const metadata: Metadata = {
  title: "Reports - Consolidado",
};

// Fonte do tema Zen Linen — carregada só nesta rota (mesmo padrão de
// /kpi/operadores, /kpi/gestor e /kpi/evolucao: next/font/google gera uma
// variável escopada ao módulo que a importa, referenciada só dentro de
// [data-page="reports-consolidado"] em reports-consolidado.css, então não
// afeta nenhuma outra página).
const zenSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--font-zen-sans",
});

export const revalidate = 300;

// Loading "fake" de piso mínimo: o loading.tsx (Suspense fallback, formato
// "consolidado" do KpiLoadingScreen) foi desenhado pra replicar a posição
// exata dos cards da página real — mas se os dados voltarem rápido (ex.:
// cache quente, rede boa), ele só pisca na tela por uma fração de segundo,
// que o pedido considerou "ruim"/instável visualmente. Não dá pra controlar
// isso no client (loading.tsx é só o fallback declarativo do Suspense do
// Next, sem lógica própria) — o jeito é atrasar A PRÓPRIA resolução deste
// Server Component até completar MIN_LOADING_MS, contados desde a entrada
// na função. Se a busca real já demorou mais que isso, `aguardarPisoMinimo`
// não espera nada (Math.max trava em 0) — só estica quando sobrou tempo.
const MIN_LOADING_MS = 3_000;

async function aguardarPisoMinimo(desde: number) {
  const faltam = MIN_LOADING_MS - (Date.now() - desde);
  if (faltam > 0) {
    await new Promise((resolve) => setTimeout(resolve, faltam));
  }
}

export default async function ReportsConsolidadoPage() {
  const inicioCarregamento = Date.now();

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Gate explícito por role: só GESTOR acessa esta tela (resumo + detalhe
  // analítico, fundidos numa página só). O ADM mantém a permissão
  // view_gestor_panel, mas é redirecionado aqui (não é gestor).
  if (user.profile.role !== "GESTOR") {
    redirect(getPostLoginPath(user.profile.role));
  }

  // getGestorConsolidado roda UMA vez aqui: reportHora/reportNomeSupervisor
  // são passados como prop tanto pra GestorEquipeSection quanto pra
  // RetencaoDetalheSection, em vez de cada seção buscar de novo.
  const [{ data, reportHora, reportNomeSupervisor }, nomeFantasiaConfig, configTabela, rvFaixas, emailsEquipe] =
    await Promise.all([
      getGestorConsolidado(user.profile.id),
      getNomeFantasiaConfig(user.profile.id),
      getConfigTabela(user.profile.id),
      getCurrentPerUnitFaixas(),
      getEmailsEquipe(user.profile.id),
    ]);

  const nomeFantasia = {
    ativo: nomeFantasiaConfig.ativo,
    mapa: Object.fromEntries(nomeFantasiaConfig.mapa),
  };

  // Piso mínimo de loading (ver comentário em MIN_LOADING_MS acima) —
  // aplicado depois de TODAS as buscas (inclusive getCurrentUser, no início
  // da função), cobrindo os dois caminhos abaixo (vazio e com dados).
  await aguardarPisoMinimo(inicioCarregamento);

  if (data.operadores.length === 0) {
    return (
      <PageTransition>
        <div
          data-page="reports-consolidado"
          className={`flex min-h-[60vh] items-center justify-center px-6 ${zenSans.variable}`}
        >
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

  // NÃO envolvido em <PageTransition> (diferente do branch "sem dados"
  // acima): PageTransition faz um fade a partir de opacity:0 via
  // motion/react, que só anima depois que o JS hidrata no client. Como esta
  // página já tem loading.tsx cobrindo a espera do Server Component, esse
  // fade adicional (mais o fade PRÓPRIO de GestorEquipeSection, com delay de
  // 150ms) fazia o HTML real — já com os dados — ficar invisível
  // (opacity:0, renderizado no SSR do jeito que motion faz) por uma janela
  // perceptível entre o loading.tsx sumir e a hidratação/animação
  // terminarem, especialmente com o bundle client pesado desta rota (GSAP +
  // ScrollTrigger + motion). Isso é exatamente a sequência "loading → tela
  // vazia → dados" reportada. Removendo o fade aqui (o conteúdo já vem
  // pronto via SSR, não precisa de entrada animada pra mascarar loading
  // nenhum — quem faz esse papel é o loading.tsx), o swap loading→conteúdo
  // fica direto, sem intervalo vazio. Ver mesma correção em
  // GestorEquipeSection (initial={false} no motion.section).
  return (
    <>
      {/*
        Navegação lateral animada, EXCLUSIVA desta página (não é layout
        global) — ver comentário em consolidado-nav-sidebar.tsx. position:
        fixed, então fica fora do fluxo do container centralizado abaixo.
      */}
      <ConsolidadoNavSidebar />

      <div
        data-page="reports-consolidado"
        className={`min-h-screen px-6 py-8 lg:px-12 lg:py-12 ${zenSans.variable}`}
      >
        <div className="mx-auto max-w-7xl">
          {/*
            Cabeçalho (título "Consolidado" + linha "{nome} fez um report às
            {hora}") é renderizado DENTRO de GestorEquipeSection, não aqui —
            mesmo motivo do KpiEquipeSection em /kpi/operadores: o texto do
            report vem do polling de 30s (estado client), então só pode viver
            num Client Component. Ver o topo de GestorEquipeSection.
          */}
          <div className="space-y-10">
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

            <RetencaoDetalheSection
              emailsEquipeIniciais={emailsEquipe}
              gestorId={user.profile.id}
              gestora={gestora}
              reportHoraInicial={reportHora}
            />
            {/* SignatureFooter agora é renderizada dentro de RetencaoDetalheSection
                (no desktop, logo abaixo do último card do trilho). */}
          </div>
        </div>
      </div>
    </>
  );
}
