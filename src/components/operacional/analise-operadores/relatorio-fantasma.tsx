import { KpiFrame } from "@/app/(dashboard)/s/kpi/operadores/_components/kpi-frame";
import { cn } from "@/lib/utils";

/**
 * Skeleton do relatório de /kpi/evolucao — mesma construção do loading de
 * /s/reports/consolidado: blocos `bg-card` (tons remapeados por
 * .kpi-evolucao-skeleton em kpi-evolucao.css, iguais a
 * .consolidado-skeleton — o bg-card puro / opacidades baixas ficavam
 * apagados demais no tema claro), dentro do MESMO KpiFrame real, sem
 * spinner e com entrada em fade.
 *
 * Geometria = a do relatório real (kpi-principal-card.tsx,
 * quartil-faixa.tsx, kpi-secundarios-grid.tsx), pra nada "pular" quando os
 * dados chegam: faixa de título (.kpi-evolucao-titulo-head) com nome +
 * meta à esquerda e média à direita, gráfico de 240px, faixa de quartil com
 * um marcador por mês e o cabeçalho recolhido de "KPIs secundários".
 *
 * Usado em quatro estados: loading da rota (loading.tsx), troca de
 * operador/período/"incluir mês atual" (relatorio-carregando.tsx), sem
 * operador selecionado (estado-vazio-operador.tsx) e operador sem dados no
 * período (analise-operadores-section.tsx) — só muda a mensagem sobre o
 * gráfico.
 */

export function SkeletonBloco({ className }: { className: string }) {
  return <div className={cn("rounded-md bg-card", className)} aria-hidden="true" />;
}

/** Card de KPI principal em skeleton. */
export function SkeletonKpiCard({
  nMeses,
  mensagem,
}: {
  nMeses: number;
  /** Texto sobre o gráfico (ex.: "Sem operador selecionado"). Sem texto = só o bloco. */
  mensagem?: string;
}) {
  return (
    <KpiFrame>
      {/* Faixa de título — mesmas alturas de linha do card real: nome
          (ds-body, 21px) + meta (text-xs, 16px) à esquerda; média
          (ds-display text-2xl, 32px) + rótulo (10px) à direita. */}
      <div className="kpi-evolucao-titulo-head flex items-end justify-between gap-4 px-4 py-2.5">
        <div>
          <div className="flex h-[21px] items-center">
            <SkeletonBloco className="h-3 w-40" />
          </div>
          <div className="mt-0.5 flex h-4 items-center">
            <SkeletonBloco className="h-2.5 w-24 bg-card/70" />
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex h-8 items-center">
            <SkeletonBloco className="h-6 w-20" />
          </div>
          <div className="flex h-[15px] items-center">
            <SkeletonBloco className="h-2 w-10 bg-card/70" />
          </div>
        </div>
      </div>

      <div className="px-2 pt-5 pb-2">
        {/* Gráfico — mesmo bloco do gráfico do Consolidado (bg-card/60). */}
        <div className="relative h-[240px] w-full rounded-lg bg-card/60">
          {mensagem && (
            <span className="text-muted-foreground font-sans absolute inset-x-0 top-3 flex justify-center px-4 text-center text-xs tracking-wider uppercase">
              {mensagem}
            </span>
          )}
        </div>

        {/* Faixa de quartil — título + um marcador (h-6) e um rótulo de mês
            por coluna, mesmo grid de quartil-faixa.tsx. */}
        <div className="border-border/40 mt-4 border-t pt-4">
          <div className="space-y-1">
            <div className="flex h-[15px] items-center">
              <SkeletonBloco className="h-2.5 w-72 max-w-full bg-card/70" />
            </div>
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: `repeat(${nMeses}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: nMeses }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-0.5">
                  <SkeletonBloco className="h-6 w-full rounded bg-card/60" />
                  <div className="flex h-[13.5px] items-center">
                    <SkeletonBloco className="h-2 w-6 bg-card/40" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </KpiFrame>
  );
}

/**
 * Relatório inteiro em skeleton: N cards de KPI principal (space-y-10) +
 * o cabeçalho recolhido "KPIs secundários" (o grid real abre fechado).
 */
export function SkeletonRelatorio({
  nPrincipais,
  nMeses,
  temSecundarios = true,
  mensagem,
  className,
}: {
  nPrincipais: number;
  nMeses: number;
  temSecundarios?: boolean;
  mensagem?: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "kpi-evolucao-skeleton animate-in fade-in space-y-8 duration-300 motion-reduce:animate-none",
        className,
      )}
    >
      <div className="space-y-10">
        {Array.from({ length: nPrincipais }).map((_, i) => (
          <SkeletonKpiCard key={i} nMeses={nMeses} mensagem={mensagem} />
        ))}
      </div>

      {temSecundarios && (
        <div className="flex h-4 items-center gap-2">
          <SkeletonBloco className="h-4 w-4 rounded-sm bg-card/70" />
          <SkeletonBloco className="h-3 w-40" />
        </div>
      )}
    </div>
  );
}
