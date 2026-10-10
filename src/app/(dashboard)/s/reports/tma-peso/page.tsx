import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import "./reports-tma-peso.css";

import { ConsolidadoScrollProgress } from "@/components/gestor/consolidado-scroll-progress";
import { FonteInter } from "@/components/gestor/fonte-inter";
import { StyledCard } from "@/components/gestor/styled-card";
import { AnaliticoTmaSection } from "@/components/tma/analitico-tma-section";
import { GestorTmaSection } from "@/components/tma/gestor-tma-section";
import { TmaNavSidebar } from "@/components/tma/tma-nav-sidebar";
import type { TmaLinha } from "@/components/tma/tma-table";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { getPostLoginPath } from "@/lib/auth/post-login-path";
import { getRosterOperadoresGestor } from "@/lib/d1-db/get-roster-gestor";
import { resolverNomeExibicao } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import { getNomeFantasiaConfig } from "@/lib/gestor/nome-fantasia/get-config";
import { getGestorTma } from "@/lib/tma/get-gestor-tma";
import { getGestorTmaAnalitico } from "@/lib/tma/get-gestor-tma-analitico";

export const metadata: Metadata = {
  title: "Reports - TMA & Peso",
};

// Piso mínimo de loading — mesmo de /s/reports/consolidado: se os dados
// voltarem rápido, o loading.tsx não fica só piscando na tela. Contado
// desde a entrada na função; se as buscas já demoraram mais, não espera.
//
// RISCO-ACEITO: carregamento da página (navegação e reload após upload) espera no mínimo 1s mesmo com os dados prontos.
// Motivo: decisão de produto — sem o piso, o loading.tsx só pisca na tela (mesmo piso mantido no Consolidado nas auditorias de 2026-10-07).
// Mitigação: só estica quando a busca real foi mais rápida que 1s; re-render dentro de Server Action não espera (guarda `next-action` abaixo).
// Revisar quando: o usuário pedir pra remover o piso, ou o loading.tsx deixar de ser um esqueleto (sem "pulo" visual).
const MIN_LOADING_MS = 1_000;

async function aguardarPisoMinimo(desde: number) {
  // Re-render disparado por Server Action (mesma guarda do Consolidado): a
  // página é refeita DENTRO da resposta da action, sem loading.tsx na tela —
  // o piso só atrasaria a action em 1s. Hoje nenhuma action desta rota chama
  // revalidatePath; a guarda fica para o caso de alguma voltar a revalidar.
  if ((await headers()).has("next-action")) return;
  const faltam = MIN_LOADING_MS - (Date.now() - desde);
  if (faltam > 0) {
    await new Promise((resolve) => setTimeout(resolve, faltam));
  }
}

export default async function ReportsTmaPage() {
  const inicioCarregamento = Date.now();

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Gate explícito por role: só GESTOR acessa esta tela (com ou sem
  // is_admin_skill — a role continua "GESTOR"). O ADM puro é redirecionado
  // aqui e, de qualquer forma, o middleware já o confina a /bases e
  // /configuracoes antes de chegar nesta rota.
  if (user.profile.role !== "GESTOR") {
    redirect(getPostLoginPath(user.profile.role));
  }

  // Roster e threshold do TMA são memoizados por requisição (cache()), então
  // getGestorTma/getGestorTmaAnalitico não os consultam de novo.
  const [
    tma,
    nomeFantasiaConfig,
    analitico,
    roster,
  ] = await Promise.all([
    getGestorTma(user.profile.id),
    getNomeFantasiaConfig(user.profile.id),
    getGestorTmaAnalitico(user.profile.id),
    getRosterOperadoresGestor(user.profile.id),
  ]);

  // Erro de banco na tabela (d1_tma, roster, ordenação, meta): card de erro, e não a tabela toda zerada que parecia "sem
  // dados do dia". Falha ao ler o nome fantasia também é erro da página: o
  // fallback (ativo=false) revelaria nomes reais na tabela e no "Copiar
  // imagem", sem avisar. Mesmo card de erro do Consolidado (page.tsx de
  // /s/reports/consolidado), sem o anexo. Erro só do Analítico fica dentro
  // da própria seção (AnaliticoTmaSection), como no Consolidado.
  if (tma.erro || nomeFantasiaConfig.erro) {
    await aguardarPisoMinimo(inicioCarregamento);
    return (
      <>
        <ConsolidadoScrollProgress />
        <FonteInter dataPage="reports-tma-peso" toastClass="toast-padrao" />
        <div data-page="reports-tma-peso" className="pagina-padrao min-h-screen px-6 py-8 lg:px-12 lg:py-12">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="pt-4">
              <h1 className="font-sans text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                TMA &amp; Peso
              </h1>
            </div>

            <StyledCard
              withGradient
              className="flex min-h-[220px] flex-col items-center justify-center gap-2 p-10 text-center"
            >
              <h3 className="ds-h3 text-foreground font-semibold">Não foi possível carregar a equipe</h3>
              <p className="ds-body text-muted-foreground max-w-md text-sm">
                Houve uma falha ao consultar a base. Tente novamente em instantes.
              </p>
              {/* Link (não botão com JS): recarrega a rota pelo servidor,
                  passando pelo loading.tsx de sempre — igual ao Consolidado. */}
              <a
                href="/s/reports/tma-peso"
                className="font-sans border-border text-foreground hover:bg-muted/40 mt-2 inline-flex h-8 cursor-pointer items-center rounded-md border bg-transparent px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
              >
                Tentar novamente
              </a>
            </StyledCard>
          </div>
        </div>
      </>
    );
  }

  const { operadores, reportHora, reportNomeSupervisor, reportDatasBase, metaAtualMmSs, ordemTabela, thresholdConfig, versaoBase } = tma;

  const nomeFantasia = {
    ativo: nomeFantasiaConfig.ativo,
    mapa: Object.fromEntries(nomeFantasiaConfig.mapa),
  };

  const linhas: TmaLinha[] = operadores.map((op) => ({
    ...op,
    nomeExibicao: resolverNomeExibicao(op.operatorEmail, nomeFantasia),
  }));

  // Hoje sempre true (o bloqueio acima só deixa GESTOR, que tem
  // manage_d1_base). Mantido como no Consolidado: se a permissão deixar de
  // ser de todo GESTOR, o anexo e o "Limpar Base" somem sem mexer no JSX.
  const showUpload = can(user.profile.role, "manage_d1_base");

  // Piso mínimo de loading (ver comentário em MIN_LOADING_MS acima) —
  // aplicado depois de TODAS as buscas em paralelo acima.
  await aguardarPisoMinimo(inicioCarregamento);

  // Sem <PageTransition>: o conteúdo já vem pronto via SSR e o loading.tsx
  // cobre a espera (mesmo motivo documentado em reports/consolidado/page.tsx).
  return (
    <>
      <ConsolidadoScrollProgress />
      {/* Navegação lateral da página (position: fixed, fora do container). */}
      <TmaNavSidebar />
      <FonteInter dataPage="reports-tma-peso" toastClass="toast-padrao" />

      <div data-page="reports-tma-peso" className="pagina-padrao min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-7xl">
          <div className="space-y-10">
            <GestorTmaSection
              linhas={linhas}
              reportHora={reportHora ?? "—"}
              reportNomeSupervisor={reportNomeSupervisor}
              datasBaseReport={reportDatasBase}
              metaAtualMmSs={metaAtualMmSs}
              ordemTabela={ordemTabela}
              showUpload={showUpload}
              nomeFantasia={nomeFantasia}
              olhoInicial={nomeFantasiaConfig.olhoTma}
              thresholdConfig={thresholdConfig}
              versaoBaseInicial={versaoBase}
            />

            <AnaliticoTmaSection roster={roster} analitico={analitico} operadores={operadores} />
          </div>
        </div>
      </div>
    </>
  );
}
