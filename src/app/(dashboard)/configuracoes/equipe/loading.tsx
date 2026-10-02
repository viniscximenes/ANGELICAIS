// Suspense fallback do Next.js pra /configuracoes/equipe — mostrado
// automaticamente enquanto o Server Component de page.tsx (async, aguarda
// getEquipeAction, mais o piso mínimo de MIN_LOADING_MS — ver page.tsx)
// ainda não resolveu.
//
// Mesmas formas do skeleton de /s/reports/consolidado (blocos mudos, mesmo
// tom, fade-in), mas ESPELHANDO o layout real desta página: mesmo wrapper
// (`data-page`, `max-w-2xl`, paddings), título/subtítulo nas mesmas
// alturas, o MESMO ConfigFrame (cantoneiras reais) com a linha do toggle,
// a tabela Operador / Nome Fantasia / ações e a linha de adicionar, e a
// nota de rodapé. Todo bloco ocupa a mesma posição/tamanho do elemento
// real, evitando o "pulo" de layout quando os dados chegam.
import { Instrument_Sans } from "next/font/google";

import "./configuracoes-equipe.css";
import { ConfigFrame } from "./_components/config-frame";

// MESMA fonte/variável de page.tsx (zenSans) — loading.tsx monta ANTES de
// page.tsx resolver, então precisa importar de novo.
const zenSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--font-zen-sans",
});

const TABLE_ROWS = 6;

function SkeletonBloco({ className }: { className: string }) {
  return <div className={`rounded-md bg-card ${className}`} aria-hidden="true" />;
}

/** Linha do toggle — texto (título + descrição) à esquerda e o Switch
 * (32×18px) à direita, com a mesma borda tracejada inferior. */
function SkeletonToggle() {
  return (
    <div className="border-border flex items-center justify-between gap-4 border-b border-dashed pb-4">
      <div className="min-w-0 space-y-1.5 py-0.5">
        <SkeletonBloco className="h-3.5 w-[230px]" />
        <SkeletonBloco className="h-3 w-[300px] max-w-full bg-card/70" />
      </div>
      <SkeletonBloco className="h-[18px] w-8 shrink-0 rounded-full" />
    </div>
  );
}

/** Tabela — cabeçalho com o mesmo fundo/borda do real (49px: py-3.5 +
 * linha de 21px) e linhas de 49px (input h-8 + py-2 + borda). */
function SkeletonTabela() {
  return (
    <div className="mt-4 overflow-hidden">
      <div className="flex h-[49px] items-center gap-6 border-b border-border bg-muted/40 px-3">
        <SkeletonBloco className="h-3 w-[90px] bg-muted-foreground/20" />
        <SkeletonBloco className="h-3 w-[130px] bg-muted-foreground/20" />
      </div>

      {Array.from({ length: TABLE_ROWS }).map((_, row) => (
        <div key={row} className="flex h-[49px] items-center gap-6 border-b border-border/40 px-3">
          {/* Operador — prefixo do email. */}
          <div className="w-[40%] min-w-0">
            <SkeletonBloco className="h-3 w-[75%]" />
          </div>
          {/* Nome Fantasia — caixa do input (h-8). */}
          <div className="min-w-[140px] flex-1">
            <SkeletonBloco className="h-8 w-full rounded-lg bg-card/60" />
          </div>
          {/* Ações — botão de remover (icon-sm, 28px). */}
          <SkeletonBloco className="h-7 w-7 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** Linha de adicionar — input flex-1 + botão "Adicionar" (ambos h-8). */
function SkeletonAdicionar() {
  return (
    <div className="border-border mt-4 border-t border-dashed pt-4">
      <div className="flex gap-2">
        <SkeletonBloco className="h-8 flex-1 rounded-lg bg-card/60" />
        <SkeletonBloco className="h-8 w-[104px] shrink-0 rounded-lg" />
      </div>
    </div>
  );
}

export default function LoadingConfiguracoesEquipe() {
  return (
    // config-equipe-skeleton: tom dos blocos (configuracoes-equipe.css),
    // mesmo do skeleton do Consolidado.
    <div
      data-page="configuracoes-equipe"
      className={`config-equipe-skeleton relative min-h-screen px-6 py-8 lg:px-12 lg:py-12 ${zenSans.variable}`}
    >
      <div
        aria-hidden="true"
        className="mx-auto max-w-2xl animate-in fade-in duration-300 motion-reduce:animate-none"
      >
        {/* ── Cabeçalho (título "Equipe" + nome do gestor) ── */}
        <div className="pt-4">
          <SkeletonBloco className="h-9 w-[150px] md:h-10" />
          <div className="pt-3">
            <SkeletonBloco className="h-3.5 w-[180px] bg-card/70" />
          </div>
        </div>

        {/* ── Card de configuração + nota de rodapé ── */}
        <div className="space-y-6 pt-8">
          <ConfigFrame className="p-6">
            <SkeletonToggle />
            <SkeletonTabela />
            <SkeletonAdicionar />
          </ConfigFrame>

          <div className="space-y-1.5">
            <SkeletonBloco className="h-3 w-full bg-card/70" />
            <SkeletonBloco className="h-3 w-[60%] bg-card/70" />
          </div>
        </div>
      </div>

      {/* Sem indicador girando: o carregamento é só o skeleton. Fica apenas
          o aviso para leitor de tela. */}
      <div role="status" aria-live="polite" className="sr-only">
        Carregando Equipe, aguarde.
      </div>
    </div>
  );
}
