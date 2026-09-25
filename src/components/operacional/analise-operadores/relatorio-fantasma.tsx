import { StyledCard } from "@/components/gestor/styled-card";
import { KpiFrame } from "@/app/(dashboard)/kpi/operadores/_components/kpi-frame";

/**
 * Cards "fantasma" (sem dado real) reaproveitados por dois estados de
 * /kpi/evolucao: o estado vazio (sem operador selecionado,
 * estado-vazio-operador.tsx) e o loading ao selecionar/trocar operador
 * (relatorio-carregando.tsx) — mesma estrutura visual do relatório real,
 * só muda a mensagem sobreposta ao gráfico fantasma. Extraído pra um
 * arquivo só, sem duplicar entre os dois.
 *
 * Sem Recharts: os "gráficos" são um `<path>` de SVG estático (uma curva
 * decorativa fixa, não dados) — mais leve, e sem risco do aviso
 * `width(-1)/height(-1)` do ResponsiveContainer (que só existe pra medir
 * um contêiner real com dados de verdade).
 */

const CURVA_PRINCIPAL =
  "M0,64 C 40,30 70,90 110,55 C 150,20 190,85 230,48 C 260,20 290,60 320,42 C 345,28 370,50 400,38";
const CURVA_SPARKLINE = "M0,15 L15,8 L30,17 L45,6 L60,13 L75,9 L90,15 L100,10";

export function GhostKpiCard({
  nome,
  nMeses,
  mensagem,
}: {
  nome: string;
  nMeses: number;
  /** Texto sobreposto ao gráfico fantasma — "Sem operador selecionado" no
   *  estado vazio, "Carregando…" durante a troca de operador. */
  mensagem: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className="ds-h3 text-foreground/70 font-semibold">{nome}</h3>
          <p className="ds-small text-muted-foreground/70 mt-0.5 text-xs">
            Meta: ?
          </p>
        </div>
        <div className="text-right">
          <p className="ds-display text-muted-foreground/40 text-2xl font-semibold">
            ?
          </p>
          <p className="text-muted-foreground/50 text-[10px] tracking-wider uppercase">
            média
          </p>
        </div>
      </div>

      <StyledCard className="p-5" withGradient>
        <div className="relative h-[240px] w-full overflow-hidden rounded-[var(--radius)]">
          <svg
            viewBox="0 0 400 120"
            preserveAspectRatio="none"
            className="text-muted-foreground/25 h-full w-full motion-safe:animate-pulse motion-reduce:animate-none"
          >
            <line
              x1="0"
              y1="100"
              x2="400"
              y2="100"
              stroke="currentColor"
              strokeOpacity={0.5}
              strokeDasharray="6 5"
            />
            <path
              d={CURVA_PRINCIPAL}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          </svg>
          {/*
            No topo (não centralizado na vertical) — a curva fantasma passa
            perto do meio da caixa, e o texto centralizado encostava nela.
            Só depende da altura fixa (h-[240px] no container pai), não da
            largura — estável em qualquer largura de tela.
          */}
          <span className="text-muted-foreground/40 font-sans absolute inset-x-0 top-3 flex justify-center text-xs tracking-wider uppercase">
            {mensagem}
          </span>
        </div>

        <div className="border-border/30 mt-4 border-t pt-4">
          <p className="font-sans text-muted-foreground/50 text-[10px] font-semibold tracking-wider uppercase">
            Quartil no mês (Q1 melhor · Q4 pior) — vs. toda a empresa
          </p>
          <div
            className="mt-1 grid gap-1"
            style={{ gridTemplateColumns: `repeat(${nMeses}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: nMeses }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <div className="border-border/30 text-muted-foreground/30 flex h-6 w-full items-center justify-center rounded border border-dashed text-[11px]">
                  ?
                </div>
                <span className="text-muted-foreground/30 text-[9px]">--</span>
              </div>
            ))}
          </div>
        </div>
      </StyledCard>
    </div>
  );
}

export function GhostSecundarioCard({ nome }: { nome: string }) {
  return (
    <StyledCard className="flex flex-col gap-2 p-4" withGradient corners="none">
      <p className="text-muted-foreground/60 text-[10px] font-semibold tracking-wider uppercase">
        {nome}
      </p>
      <p className="ds-display text-muted-foreground/35 text-lg font-semibold">
        ?
      </p>
      <div className="h-8 w-full">
        <svg
          viewBox="0 0 100 20"
          preserveAspectRatio="none"
          className="text-muted-foreground/25 h-full w-full"
        >
          <path
            d={CURVA_SPARKLINE}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </svg>
      </div>
    </StyledCard>
  );
}

export function GhostIdentificacaoBloco() {
  const linhas = [
    "Operador",
    "Período",
    "Meses com dados",
    "Gerado por",
    "Gerado em",
  ];
  return (
    <KpiFrame className="p-5">
      <p className="font-sans text-muted-foreground/70 text-xs font-semibold tracking-wider uppercase">
        Relatório de performance histórica
      </p>
      <div className="mt-3 grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
        {linhas.map((label) => (
          <div
            key={label}
            className="border-border/30 flex items-baseline justify-between gap-3 border-b border-dashed py-1.5"
          >
            <span className="font-sans text-muted-foreground/60 text-[11px] tracking-wide uppercase">
              {label}
            </span>
            <span className="font-sans text-muted-foreground/40 text-right text-sm font-medium">
              —
            </span>
          </div>
        ))}
      </div>
    </KpiFrame>
  );
}
