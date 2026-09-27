import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Instrument_Sans } from "next/font/google";

import "./reports-tempo-indisp.css";
import { TempoIndispSection } from "@/components/dashboard/tempo-indisponibilidade/tempo-indisp-section";
import { TempoIndispNavSidebar } from "@/components/gestor/tempo-indisp-nav-sidebar";
import { SignatureFooter } from "@/components/gestor/signature-footer";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { getPostLoginPath } from "@/lib/auth/post-login-path";
import { getPausasProgramadas } from "@/lib/bases/pausas-programadas/actions/get-pausas-programadas";
import { getGestorIndisponibilidade } from "@/lib/d1-db/get-gestor-indisponibilidade";
import { getGestorTempoLogado } from "@/lib/d1-db/get-gestor-tempo-logado";
import { getRosterOperadoresGestor } from "@/lib/d1-db/get-roster-gestor";
import { getConfigAderencia } from "@/lib/gestor/config-aderencia/get-config-aderencia";
import { getConfigTabelaTempoIndisp } from "@/lib/gestor/config-tabela-tempo-indisp/get-config-tabela-tempo-indisp";
import { getNomeFantasiaConfig } from "@/lib/gestor/nome-fantasia/get-config";

export const metadata: Metadata = {
  title: "Reports - Tempo Logado & Indisponibilidade",
};

// Fonte do tema Zen Linen — carregada só nesta rota, mesmo padrão de
// /reports/consolidado, /kpi/operadores etc: next/font/google gera uma
// variável escopada ao módulo que a importa, referenciada só dentro de
// [data-page="reports-tempo-indisponibilidade"] em reports-tempo-indisp.css,
// então não afeta nenhuma outra página.
const zenSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--font-zen-sans",
});

export const revalidate = 300;

// Mesmo piso mínimo de /reports/consolidado: o fallback de loading permanece
// por pelo menos 3s contando desde a entrada na página. Se as buscas já
// consumirem esse tempo, não há espera adicional.
const MIN_LOADING_MS = 3_000;

async function aguardarPisoMinimo(desde: number) {
  const faltam = MIN_LOADING_MS - (Date.now() - desde);
  if (faltam > 0) {
    await new Promise((resolve) => setTimeout(resolve, faltam));
  }
}

export default async function ReportsTempoIndisponibilidadePage() {
  const inicioCarregamento = Date.now();

  const user = await getCurrentUser();

  if (!user) redirect("/login");

  if (user.profile.role !== "GESTOR") {
    redirect(getPostLoginPath(user.profile.role));
  }

  // Roster da equipe D-1 (d1_operadores_gestor) e config da tabela unificada
  // (meta de Indisp.% + ordenação) buscados antes do resto: o roster porque
  // getPausasProgramadas precisa dele, e a config porque getGestorIndisponibilidade
  // precisa da meta pra calcular cumpriuMeta.
  const [rosterD1, configTabelaTempoIndisp] = await Promise.all([
    getRosterOperadoresGestor(user.profile.id),
    getConfigTabelaTempoIndisp(user.profile.id),
  ]);

  // Fetch único da página (antes dividido entre esta rota e
  // /analitico, hoje fundidas): tempo logado, indisponibilidade,
  // nome fantasia, pausas programadas (filtradas pelo roster) e
  // tolerância de aderência.
  const [dataTempoLogado, dataIndisponibilidade, nomeFantasiaConfig, pausasProgramadas, configAderencia] =
    await Promise.all([
      getGestorTempoLogado(user.profile.id),
      getGestorIndisponibilidade(user.profile.id, configTabelaTempoIndisp.metaIndisponibilidade),
      getNomeFantasiaConfig(user.profile.id),
      getPausasProgramadas(rosterD1),
      getConfigAderencia(user.profile.id),
    ]);

  await aguardarPisoMinimo(inicioCarregamento);

  // Os dois datasets vêm do mesmo upload de BASE - 2 — se um vier vazio,
  // tratamos como falha (evita renderizar a página pela metade).
  if (
    dataTempoLogado.operadores.length === 0 ||
    dataIndisponibilidade.operadores.length === 0
  ) {
    return (
      <PageTransition>
        <div
          data-page="reports-tempo-indisponibilidade"
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

  const nomeFantasia = {
    ativo: nomeFantasiaConfig.ativo,
    mapa: Object.fromEntries(nomeFantasiaConfig.mapa),
  };

  // NÃO envolvido em <PageTransition> (diferente do branch "sem dados"
  // acima) — mesmo motivo documentado em reports/consolidado/page.tsx:
  // PageTransition faz um fade a partir de opacity:0 via motion/react, que
  // só anima depois que o JS hidrata no client. Como esta página agora tem
  // loading.tsx cobrindo a espera do Server Component, esse fade adicional
  // faria o HTML real (já com os dados) ficar invisível por uma janela
  // perceptível entre o loading.tsx sumir e a hidratação terminar —
  // exatamente a sequência "loading → tela vazia → dados" já corrigida no
  // consolidado. Removendo o fade aqui, o swap loading→conteúdo fica direto.
  return (
    <>
      {/*
        Navegação lateral animada, EXCLUSIVA desta página — mesmo
        componente/mecanismo do ConsolidadoNavSidebar (ambos delegam a
        FloatingNavSidebar), só com a lista de itens trocada. position:
        fixed, fica fora do fluxo do container centralizado abaixo — mesma
        posição de ConsolidadoNavSidebar em /reports/consolidado.
      */}
      <TempoIndispNavSidebar />

      <div
        data-page="reports-tempo-indisponibilidade"
        className={`min-h-screen px-6 py-8 lg:px-12 lg:py-12 ${zenSans.variable}`}
      >
        <div className="mx-auto max-w-7xl">
          {/*
            Cabeçalho (título "Tempo Logado & Indisponibilidade" + linha
            "{supervisor} fez um report às {hora}" + controles) é renderizado
            DENTRO de TempoIndispSection, não aqui — mesmo motivo do
            GestorEquipeSection em /reports/consolidado: o texto do report e
            os controles (engrenagem, limpar base) dependem de estado client
            atualizado por refetch() após ações do gestor, então só podem
            viver num Client Component. Ver o topo de TempoIndispSection.
          */}
          <TempoIndispSection
            operadoresTempoLogadoIniciais={dataTempoLogado.operadores}
            operadoresIndisponibilidadeIniciais={dataIndisponibilidade.operadores}
            horaReportInicial={dataTempoLogado.horaReport ?? null}
            nomeSupervisorReportInicial={dataTempoLogado.nomeSupervisorReport}
            pausasProgramadas={pausasProgramadas}
            toleranciaMin={configAderencia.toleranciaMin}
            showUpload={showUpload}
            nomeFantasia={nomeFantasia}
            olhoInicial={nomeFantasiaConfig.olhoTempoIndisponibilidade}
            metaIndisponibilidadeInicial={configTabelaTempoIndisp.metaIndisponibilidade}
            ordemTabelaInicial={configTabelaTempoIndisp.ordemTabela}
          />

          {/*
            MESMO componente/posição do consolidado (SignatureFooter,
            reports/consolidado/page.tsx): irmã, DEPOIS de todo o conteúdo
            de scroll (incluindo o trilho horizontal pinado dentro de
            TempoIndispSection) — fora de qualquer área pinada, em fluxo de
            documento normal. Sem espaçador manual e sem dynamicHeight: o
            consolidado também não usa nenhum dos dois pra ela (investigado
            — ela nunca esteve dentro do trilho, então nunca precisou
            entrar no cálculo de altura/pin do GSAP).
          */}
          <SignatureFooter />
        </div>
      </div>
    </>
  );
}
