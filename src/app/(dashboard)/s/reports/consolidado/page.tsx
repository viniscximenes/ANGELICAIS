import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import "./reports-consolidado.css";
import { GestorEquipeSection } from "@/components/gestor/gestor-equipe-section";
import { RetencaoDetalheSection } from "@/components/dashboard/retencao/retencao-detalhe-section";
import { ConsolidadoNavSidebar } from "@/components/gestor/consolidado-nav-sidebar";
import { ConsolidadoScrollProgress } from "@/components/gestor/consolidado-scroll-progress";
import { FonteInter } from "@/components/gestor/fonte-inter";
import { StyledCard } from "@/components/gestor/styled-card";
import { UploadDropzone } from "@/components/d-1/upload-dropzone";
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
import { montarVersaoConsolidado, versaoExtrasConsolidado } from "@/lib/d1-db/versao-consolidado";

export const metadata: Metadata = {
  title: "Reports - Consolidado",
};

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
//
// DECISÃO DE PRODUTO (não é falha de desempenho): o piso foi pedido pelo
// usuário e mantido nas auditorias de 2026-10-07. Vale para a navegação
// inicial e para o reload após upload. Respostas de Server Action já não
// esperam (ver aguardarPisoMinimo). Não remover sem pedido explícito.
const MIN_LOADING_MS = 1_000;

async function aguardarPisoMinimo(desde: number) {
  // Re-render disparado por Server Action (revalidatePath no toggle RV,
  // salvar configuração, Limpar Base): a página é refeita DENTRO da resposta
  // da action, sem loading.tsx na tela — o piso aqui só atrasava a action em
  // 1s. O Next marca essas requisições com o header `next-action`.
  if ((await headers()).has("next-action")) return;
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
  // vão como prop pra GestorEquipeSection. Os e-mails da equipe NÃO são
  // buscados aqui — o Analítico já os recebe da própria action.
  const [{ data, reportHora, reportNomeSupervisor, reportDatasBase, erro, versao }, nomeFantasiaConfig, configTabela, rvFaixas] =
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

  // Piso mínimo de loading (ver comentário em MIN_LOADING_MS acima) —
  // aplicado depois de TODAS as buscas (inclusive getCurrentUser, no início
  // da função), cobrindo os dois caminhos abaixo (vazio e com dados).
  await aguardarPisoMinimo(inicioCarregamento);

  const showUpload = can(user.profile.role, "manage_d1_base");

  // Sem dados: mesmo título e mesma linguagem visual da página (StyledCard,
  // igual ao "Aguardando dados do dia" do Analítico) e, pra quem pode, o
  // anexo da base — antes a área de upload sumia justo quando a solução era
  // anexar a base. Após o upload, o UploadDropzone recarrega a página.
  //
  // Erro de banco (erro=true): o MESMO card, com mensagem de erro e
  // "Tentar novamente" — antes caía aqui como "sem dados" (ou, com equipe
  // cadastrada, mostrava a tabela toda zerada). Sem o anexo nesse caso: com
  // o banco falhando, o upload falharia também.
  if (erro || data.operadores.length === 0) {
    return (
      <>
        <ConsolidadoScrollProgress />
        <FonteInter dataPage="reports-consolidado" toastClass="reports-consolidado-toast" />
        <div
          data-page="reports-consolidado"
          className="pagina-padrao min-h-screen px-6 py-8 lg:px-12 lg:py-12"
        >
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="pt-4">
            <h1 className="font-sans text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Consolidado
            </h1>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
            <StyledCard
              withGradient
              className="flex min-h-[220px] flex-1 flex-col items-center justify-center gap-2 p-10 text-center"
            >
              {erro ? (
                <>
                  <h3 className="ds-h3 text-foreground font-semibold">
                    Não foi possível carregar a equipe
                  </h3>
                  <p className="ds-body text-muted-foreground max-w-md text-sm">
                    Houve uma falha ao consultar a base. Tente novamente em instantes.
                  </p>
                  {/* Link (não botão com JS): recarrega a rota pelo
                      servidor, passando pelo loading.tsx de sempre. Mesmo
                      visual do "Tentar novamente" do Analítico. */}
                  <a
                    href="/s/reports/consolidado"
                    className="font-sans border-border text-foreground hover:bg-muted/40 mt-2 inline-flex h-8 cursor-pointer items-center rounded-md border bg-transparent px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                  >
                    Tentar novamente
                  </a>
                </>
              ) : (
                <>
                  <h3 className="ds-h3 text-foreground font-semibold">Ainda não há dados da equipe</h3>
                  <p className="ds-body text-muted-foreground max-w-md text-sm">
                    {showUpload
                      ? "Anexe a base do dia ao lado. Se ela já foi anexada, confira se há operadores cadastrados na sua equipe (Configurações → Operadores do D-1)."
                      : "Confira se há operadores cadastrados na sua equipe (Configurações → Operadores do D-1) e se a base do dia já foi atualizada."}
                  </p>
                </>
              )}
            </StyledCard>

            {showUpload && !erro && (
              <div className="min-h-[220px] min-w-0 flex-1 self-stretch">
                <UploadDropzone abrirEmDownloads recarregarComModalAberto />
              </div>
            )}
          </div>
        </div>
        </div>
      </>
    );
  }

  // Converte para o formato que a EquipeTable do D-1 já aceita.
  //
  // Nome fantasia (olho fechado) é PRIVACIDADE VISUAL, não controle de acesso.
  // Objetivo: evitar exposição dos nomes reais em compartilhamento de tela /
  // apresentações. O gestor já tem autorização para ver os dados da própria
  // equipe (o servidor só entrega os operadores da equipe dele), então
  // `emailOriginal` chegar ao navegador não é vazamento: é dado que o próprio
  // usuário autenticado pode acessar. Não tratar como anonimização nem como
  // achado de segurança em auditorias.
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

  // NÃO envolvido em <PageTransition> (o branch "sem dados" acima
  // também não): PageTransition faz um fade a partir de opacity:0 via
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
      <ConsolidadoScrollProgress />
      {/*
        Navegação lateral animada, EXCLUSIVA desta página (não é layout
        global) — ver comentário em consolidado-nav-sidebar.tsx. position:
        fixed, então fica fora do fluxo do container centralizado abaixo.
      */}
      <ConsolidadoNavSidebar />
      <FonteInter dataPage="reports-consolidado" toastClass="reports-consolidado-toast" />

      <div
        data-page="reports-consolidado"
        className="pagina-padrao min-h-screen px-6 py-8 lg:px-12 lg:py-12"
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
              gestorId={user.profile.id}
              operadores={operadores}
              equipe={equipe}
              gestora={gestora}
              showUpload={showUpload}
              nomeFantasia={nomeFantasia}
              olhoInicial={nomeFantasiaConfig.olhoConsolidado}
              nomeSupervisorReport={reportNomeSupervisor}
              datasBaseReport={reportDatasBase}
              versaoInicial={montarVersaoConsolidado(versao, versaoExtrasConsolidado(nomeFantasiaConfig, rvFaixas))}
              metaTxInicial={configTabela.metaTxRetencao}
              ordemTabelaInicial={configTabela.ordemTabela}
              showRvDiarioInicial={configTabela.showRvDiario}
            />

            <RetencaoDetalheSection
              gestorId={user.profile.id}
              metaInicial={configTabela.metaTxRetencao}
            />
            {/* SignatureFooter agora é renderizada dentro de RetencaoDetalheSection
                (no desktop, logo abaixo do último card do trilho). */}
          </div>
        </div>
      </div>
    </>
  );
}
