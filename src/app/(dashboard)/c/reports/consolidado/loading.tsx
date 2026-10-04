// Suspense fallback do /c/reports/consolidado — mostrado enquanto o Server
// Component de page.tsx resolve (getMetasPolo + getCoordenadorConsolidado +
// o piso mínimo de MIN_LOADING_MS, ver page.tsx). Também é o que aparece
// depois de colar uma base: o UploadDropzone recarrega a página 3s após o
// upload concluir, caindo neste mesmo esqueleto.
//
// Mesmas formas/regras do esqueleto de /s/reports/consolidado (blocos
// bg-card com o tom de `.consolidado-skeleton` em reports-consolidado.css,
// fade de entrada, script de scroll pro topo, aviso só pra leitor de tela),
// mas no FORMATO desta página: título + linha de controles, cards de taxa
// empilhados à esquerda com o anexo à direita, e os blocos verticais
// (Tabela supervisores, Evolução do polo, Taxa por hora…) na mesma ordem e
// com alturas próximas das reais — sem "pulo" quando os dados chegam.
import { Instrument_Sans } from "next/font/google";

import "../../../s/reports/consolidado/reports-consolidado.css";
import "./coordenador-consolidado.css";

// MESMA fonte/variável de page.tsx — loading.tsx monta antes do page.tsx
// resolver; sem ela, título/subtítulo medem diferente da versão real.
const zenSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--font-zen-sans",
});

function SkeletonBloco({ className }: { className: string }) {
  return <div className={`rounded-md bg-card ${className}`} aria-hidden="true" />;
}

/** Título + texto de apoio de um card (TituloBloco / SubTitulo). */
function SkeletonTitulo({ largura = "w-56" }: { largura?: string }) {
  return (
    <div className="pb-4">
      <SkeletonBloco className={`h-5 ${largura}`} />
      <SkeletonBloco className="mt-2 h-3 w-[60%] max-w-xl bg-card/70" />
    </div>
  );
}

/** Tabela no padrão da página: cabeçalho bg-muted/40 + linhas de 42px. */
function SkeletonTabela({ linhas, colunas = 7 }: { linhas: number; colunas?: number }) {
  const grid = { gridTemplateColumns: `2.2fr repeat(${colunas - 1}, 1fr)` };
  return (
    <div className="overflow-hidden">
      <div className="grid h-10 gap-0 bg-muted/40" style={grid}>
        {Array.from({ length: colunas }).map((_, i) => (
          <div key={i} className="flex items-center justify-center px-3">
            <SkeletonBloco className="h-3 w-[60%] bg-muted-foreground/20" />
          </div>
        ))}
      </div>
      {Array.from({ length: linhas }).map((_, l) => (
        <div key={l} className="grid h-[42px] gap-0" style={grid}>
          <div className="flex items-center px-3">
            <SkeletonBloco className="h-3 w-[55%]" />
          </div>
          {Array.from({ length: colunas - 1 }).map((_, c) => (
            <div key={c} className="flex items-center justify-center px-3">
              <SkeletonBloco className="h-3 w-8" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Card de taxa (CardTaxa): rótulo, número grande e os 3 quadrinhos. */
function SkeletonCardTaxa({ destaque = false }: { destaque?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card/70 px-5 py-4">
      <SkeletonBloco className="h-3 w-28 bg-muted-foreground/15" />
      <SkeletonBloco className={`mt-2 ${destaque ? "h-9 w-32" : "h-7 w-24"}`} />
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/60 pt-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-[46px] rounded-md border border-border/60 bg-muted/30" />
        ))}
      </div>
    </div>
  );
}

const DESLIGAR_SCROLL_RESTORATION_SCRIPT = `
try {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
} catch (e) {}
`;

export default function LoadingCoordenadorConsolidado() {
  return (
    <>
      {/* Mesmo script do /s: topo da página antes do 1º paint (sem piscar na
          posição de scroll antiga). */}
      <script dangerouslySetInnerHTML={{ __html: DESLIGAR_SCROLL_RESTORATION_SCRIPT }} />
      <CoordenadorSkeleton />
    </>
  );
}

/**
 * Esqueleto do F5 (sem o script de scroll) — reaproveitado também no overlay
 * do "Limpar base" (CoordenadorConsolidadoView), como no /s: as duas telas
 * de carregamento ficam idênticas.
 */
export function CoordenadorSkeleton() {
  return (
    <>
      <div
        data-page="reports-consolidado"
        className={`consolidado-skeleton relative min-h-screen px-6 py-8 lg:px-12 lg:py-12 ${zenSans.variable}`}
      >
        <div aria-hidden="true" className="mx-auto max-w-7xl animate-in fade-in duration-300 motion-reduce:animate-none">
          <div className="space-y-12">
            {/* ── Cabeçalho: título, report, engrenagem + limpar base ── */}
            <div className="!mb-6">
              <div className="pt-4">
                <SkeletonBloco className="h-9 w-[210px] md:h-10" />
                <div className="pt-3">
                  <SkeletonBloco className="h-3.5 w-[235px] bg-card/70" />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-4 pb-2">
                <SkeletonBloco className="h-8 w-8 shrink-0" />
                <SkeletonBloco className="h-8 w-8 shrink-0" />
              </div>

              {/* Cards de taxa empilhados (3/5) + anexo (2/5), como a página. */}
              <div className="flex flex-col gap-4 pt-2 lg:flex-row lg:items-stretch">
                <div className="flex min-w-0 flex-col gap-3 lg:flex-[3]">
                  <SkeletonCardTaxa destaque />
                  <SkeletonCardTaxa />
                  <SkeletonCardTaxa />
                </div>
                <div className="min-h-[180px] min-w-0 flex-1 self-stretch lg:flex-[2]">
                  <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/40 p-6">
                    <SkeletonBloco className="h-8 w-8 rounded-full bg-muted-foreground/15" />
                    <SkeletonBloco className="h-3 w-32 bg-muted-foreground/15" />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Tabela supervisores ── */}
            <section className="!mb-6">
              <SkeletonTitulo largura="w-48" />
              <SkeletonTabela linhas={9} />
            </section>

            {/* ── Evolução do polo (gráfico 380px) ── */}
            <section className="!mb-6">
              <SkeletonTitulo largura="w-44" />
              <div className="flex flex-wrap gap-4 pb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonBloco key={i} className="h-3 w-20 bg-card/70" />
                ))}
              </div>
              <div className="h-[380px] w-full rounded-lg bg-card/60" />
            </section>

            {/* ── Taxa por hora - Supervisor ── */}
            <section className="!mb-6">
              <SkeletonTitulo largura="w-60" />
              <SkeletonTabela linhas={8} colunas={14} />
            </section>

            {/* ── Taxa por tema - Polo ── */}
            <section>
              <SkeletonTitulo largura="w-52" />
              <SkeletonTabela linhas={6} colunas={5} />
            </section>
          </div>
        </div>

        {/* Sem indicador girando (igual ao /s): só o esqueleto + aviso pra
            leitor de tela. */}
        <div role="status" aria-live="polite" className="sr-only">
          Carregando Consolidado, aguarde.
        </div>
      </div>
    </>
  );
}
