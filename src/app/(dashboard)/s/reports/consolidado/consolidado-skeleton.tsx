// Esqueleto de /s/reports/consolidado — espelha o layout real (mesmo
// wrapper, classes de título/subtítulo/botões, larguras de coluna da
// EquipeTable, KpiFrame real, alturas medidas das classes da tabela), pra não
// haver "pulo" quando os dados chegam. Usado pelo loading.tsx e pelo overlay
// do "Limpar base" (GestorEquipeSection).
//
// A barra lateral é um placeholder mudo (SkeletonNavSidebar) — a real é
// interativa e faz scroll até elementos que ainda não existem no loading.

import "./reports-consolidado.css";
import { KpiFrame } from "@/app/(dashboard)/s/kpi/operadores/_components/kpi-frame";
import { AnaliticoSkeleton } from "@/components/dashboard/retencao/analitico-skeleton";

// MESMA fonte de page.tsx (Inter, ver fonte-inter.tsx) — o loading monta ANTES
// de page.tsx resolver; sem ela o esqueleto mediria com outra fonte.
import { FonteInter } from "@/components/gestor/fonte-inter";

// Larguras reais das colunas da EquipeTable (BASE_COLUMN_WIDTHS_PX, ver
// equipe-table.tsx) — Operador / Retidos / Cancelados / Pedidos / Tx Retenção.
// Soma = 760px, igual à largura-base usada em gestor-equipe-section.tsx
// (width: `${760 + cardChromePx}px` quando a coluna RV Diário está fechada —
// o padrão inicial mais comum, por isso o skeleton assume esse estado).
const TABLE_COLUMN_WIDTHS_PX = [190, 127, 127, 126, 190] as const;
const TABLE_GRID_TEMPLATE = TABLE_COLUMN_WIDTHS_PX.map((w) => `${w}px`).join(" ");
// Nº de linhas de operador quando não se sabe o tamanho da equipe (1º acesso
// neste navegador). Depois disso vem do cookie COOKIE_LINHAS (ver abaixo).
const TABLE_ROWS_PADRAO = 20;

/**
 * Cookie com o nº de operadores da última tabela exibida neste navegador —
 * gravado por GestorEquipeSection, lido pelo loading.tsx (server) pra o
 * esqueleto ter EXATAMENTE a altura da tabela real (e o painel de anexo ao
 * lado, que estica junto, com a pasta na mesma altura).
 */
export const COOKIE_LINHAS = "consolidado_linhas";

/**
 * Cookie "1"/"0" com a coluna RV Diário aberta/fechada na última tabela vista
 * (gravado por GestorEquipeSection). Sem ele o esqueleto assumia sempre RV
 * fechado (784px) e, com RV salvo aberto, a página trocava para 944px ao
 * carregar, deslocando o card de anexo.
 */
export const COOKIE_RV = "consolidado_rv";

/** Card da tabela: 760px de colunas + 24px do KpiFrame; +160px com RV aberto (RV_COLUMN_PX). */
const LARGURA_TABELA_PX = 784;
const LARGURA_RV_PX = 160;

function SkeletonBloco({ className }: { className: string }) {
  return <div className={`rounded-md bg-card ${className}`} aria-hidden="true" />;
}

/** Linha de botões — MESMAS classes/ordem/tamanhos de gestor-equipe-section.tsx:
 * [config] [limpar base] [copiar imagem] [exibir RV + toggle], todos h-8. */
function SkeletonBarraDeAcoes() {
  return (
    <div className="flex flex-wrap items-center gap-2 pt-4 pb-2">
      <SkeletonBloco className="h-8 w-8 shrink-0" />
      <SkeletonBloco className="h-8 w-8 shrink-0" />
      <SkeletonBloco className="h-8 w-[148px] shrink-0" />
      <div className="inline-flex h-8 items-center gap-2">
        <SkeletonBloco className="h-3.5 w-[60px]" />
        <SkeletonBloco className="h-[18px] w-8 rounded-full" />
      </div>
    </div>
  );
}

/** Tabela — dentro do MESMO KpiFrame real (cantoneiras verdadeiras, não
 * desenhadas de novo), header com as 5 colunas nas proporções reais e o
 * mesmo nº de linhas de corpo da última tabela vista. Alturas medidas das classes reais (tabela-padrao.tsx):
 * cabeçalho = py-2.5 + linha de 21px + borda de 1px = 42px; linha de
 * operador = py-2 + 21px = 37px, sem borda entre linhas (só divisórias de
 * coluna); linha EQUIPE = 37px + borda de 1px em cima. Nome centralizado,
 * como na tabela real. */
function SkeletonTabelaEquipe({ linhas }: { linhas: number }) {
  return (
    <KpiFrame className="h-full">
      <div className="overflow-hidden">
        <div
          className="grid gap-0 border-b border-border bg-muted/40"
          style={{ gridTemplateColumns: TABLE_GRID_TEMPLATE }}
        >
          {TABLE_COLUMN_WIDTHS_PX.map((_, i) => (
            <div key={i} className="flex h-[41px] items-center justify-center border-r border-border/50 px-3 last:border-r-0">
              <SkeletonBloco className="h-3 w-[70%] bg-muted-foreground/20" />
            </div>
          ))}
        </div>

        {Array.from({ length: linhas }).map((_, row) => (
          <div
            key={row}
            className="grid h-[37px] gap-0"
            style={{ gridTemplateColumns: TABLE_GRID_TEMPLATE }}
          >
            {/* Operador — nome centralizado, como na tabela real. */}
            <div className="flex items-center justify-center border-r border-border/30 px-3">
              <SkeletonBloco className="h-3 w-[55%]" />
            </div>
            {/* Retidos / Cancelados / Pedidos — bloco pequeno centralizado. */}
            {[0, 1, 2].map((col) => (
              <div key={col} className="flex items-center justify-center border-r border-border/30 px-3">
                <SkeletonBloco className="h-3 w-5" />
              </div>
            ))}
            {/* Tx Retenção — só o número (a barra foi removida da tabela real). */}
            <div className="flex items-center justify-center px-3">
              <SkeletonBloco className="h-3 w-10" />
            </div>
          </div>
        ))}

        {/* Linha EQUIPE (totais) — mesmo fundo do cabeçalho, borda em cima. */}
        <div
          className="grid h-[38px] gap-0 border-t border-border bg-muted/40"
          style={{ gridTemplateColumns: TABLE_GRID_TEMPLATE }}
        >
          {TABLE_COLUMN_WIDTHS_PX.map((_, i) => (
            <div key={i} className="flex items-center justify-center border-r border-border/50 px-3 last:border-r-0">
              <SkeletonBloco className="h-3 w-[40%] bg-muted-foreground/20" />
            </div>
          ))}
        </div>
      </div>
    </KpiFrame>
  );
}

/** Painel da direita (Anexar Base) — mesmas dimensões de UploadDropzone
 * (min-h-[180px], flex-1, borda tracejada). */
function SkeletonPainelAnexo() {
  return (
    <div className="min-h-[180px] min-w-0 flex-1 self-stretch">
      <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/40 p-6">
        {/* Pasta central do UploadDropzone (≈68×60px), sem texto embaixo. */}
        <SkeletonBloco className="h-[60px] w-[68px] rounded-lg bg-muted-foreground/15" />
      </div>
    </div>
  );
}

/** Placeholder mudo da barra lateral flutuante (ConsolidadoNavSidebar) —
 * mesma casca visual (FloatingNavSidebar: fixed top-24 right-4, hidden
 * abaixo de lg, 60px colapsado, border-border/60 + rounded-xl + shadow-lg)
 * com 8 círculos no lugar dos 8 ícones reais, sem nenhuma interatividade. */
function SkeletonNavSidebar() {
  return (
    <div
      aria-hidden="true"
      data-page="reports-consolidado"
      className="fixed top-24 right-4 z-40 hidden lg:block"
    >
      {/* Mesmo ritmo do real (hover-sidebar.tsx): py-4 no corpo, cada item
          py-2 + ícone de 20px, gap-1 entre itens = 40px por item. */}
      <div className="border-border/60 flex w-[60px] flex-col items-center gap-1 rounded-xl border py-4 shadow-lg">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="contents">
            <div className="py-2">
              <SkeletonBloco className="h-5 w-5 rounded-md bg-muted-foreground/15" />
            </div>
            {/* Mesma divisória do menu real (após a tabela de operadores). */}
            {i === 0 && <div className="bg-border my-1 h-px w-7" />}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Esqueleto da página — usado pelo loading.tsx (F5) e TAMBÉM pelo overlay de
 * refresh manual do "Limpar base" (GestorEquipeSection): as duas telas de
 * carregamento ficam idênticas. Arquivo próprio (não dentro do loading.tsx)
 * porque o loading lê cookie no servidor e GestorEquipeSection é client.
 */
export function ConsolidadoSkeleton({
  linhas = TABLE_ROWS_PADRAO,
  rvAberto = false,
}: {
  linhas?: number;
  rvAberto?: boolean;
}) {
  return (
    <>
      <FonteInter dataPage="reports-consolidado" toastClass="reports-consolidado-toast" />
      <SkeletonNavSidebar />

      {/* consolidado-skeleton: tom dos blocos (reports-consolidado.css) —
          bg-card sozinho é branco puro na Vercel clara e os blocos sumiam. */}
      <div
        data-page="reports-consolidado"
        className={`consolidado-skeleton pagina-padrao relative min-h-screen px-6 py-8 lg:px-12 lg:py-12`}
      >
        <div
          aria-hidden="true"
          className={`mx-auto max-w-7xl animate-in fade-in duration-300 motion-reduce:animate-none`}
        >
          <div className="space-y-10">
            {/* ── Bloco Equipe (título + subtítulo + botões + tabela/anexo) ──
                Pulso discreto (skeleton-pulso, globals.css),
                igual ao do esqueleto do Analítico (abaixo). */}
            <div className="space-y-4 skeleton-pulso">
              <div>
                <div className="pt-4">
                  <SkeletonBloco className="h-9 w-[210px] md:h-10" />
                  {/* h-5 = altura da linha real do subtítulo (text-sm, 20px);
                      o bloco de 14px sozinho subia tudo abaixo ~6px. */}
                  <div className="flex h-5 items-center pt-3 box-content">
                    <SkeletonBloco className="h-3.5 w-[390px] max-w-full bg-card/70" />
                  </div>
                </div>

                <SkeletonBarraDeAcoes />

                <div className="flex flex-col gap-4 pt-2 lg:flex-row lg:items-stretch">
                  <div className="shrink-0" style={{ width: `${LARGURA_TABELA_PX + (rvAberto ? LARGURA_RV_PX : 0)}px`, maxWidth: "100%" }}>
                    <SkeletonTabelaEquipe linhas={linhas} />
                  </div>
                  <SkeletonPainelAnexo />
                </div>
              </div>
            </div>

            {/* ── Bloco Analítico (título + Visão Geral + Evolução) ──
                MESMO esqueleto do carregamento client-side da seção
                (AnaliticoSkeleton) — antes eram dois desenhos diferentes do
                mesmo bloco, com o gráfico em 280px contra 320px do real. */}
            <section>
              {/* Mesmo cabeçalho do real: título + divisória (traço curto
                  em cima, longo embaixo). */}
              <header className="pt-2 pb-4 mb-6 flex items-center gap-4">
                <SkeletonBloco className="h-8 w-40 shrink-0 skeleton-pulso md:h-9" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="block h-0.5 w-24 bg-muted-foreground/55" />
                  <span className="block h-0.5 w-full bg-muted-foreground/55" />
                </div>
              </header>
              <AnaliticoSkeleton />
            </section>
          </div>
        </div>

        {/* Sem indicador girando (removido a pedido): o carregamento é só o
            skeleton. Fica apenas o aviso para leitor de tela. */}
        <div role="status" aria-live="polite" className="sr-only">
          Carregando Consolidado, aguarde.
        </div>
      </div>
    </>
  );
}
