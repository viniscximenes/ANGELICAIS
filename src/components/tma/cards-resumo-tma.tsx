"use client";

import { StaticNumber } from "@/components/ui/static-number";
import { formatKpiValue } from "@/lib/kpi/atual/format-kpi-value";
import type { TmaStatus } from "@/lib/tma/tma-status";

interface CardsResumoTmaProps {
  /** Média PONDERADA pelo volume (soma duracao_segundos ÷ total de atendimentos) — mesma fonte de totalAtendidos, nunca diverge. */
  tmaMedioPonderado: number | null;
  /** MESMO threshold/status que colore a tabela principal (getTmaThresholdConfig/statusTmaDe) — "neutral" (sem meta configurada ou sem dado) cai na cor padrão, sem tingir de verde/vermelho. */
  tmaStatus: TmaStatus;
  totalAtendidos: number;
}

/**
 * Indicador principal e volume secundário: mesmas caixas neutras do
 * Analítico do Consolidado (VisaoGeralCards). data-visao-geral-cards aplica
 * o canto de 18px e o fundo do tema claro (.pagina-padrao, globals.css).
 */
export function CardsResumoTma({ tmaMedioPonderado, tmaStatus, totalAtendidos }: CardsResumoTmaProps) {
  // Classes literais (não interpoladas) — mesma ressalva de VisaoGeralCards:
  // o scanner do Tailwind precisa achar a string inteira no código-fonte.
  const tmaClassName =
    tmaStatus === "danger"
      ? "text-danger dark:text-danger"
      : tmaStatus === "success"
        ? "text-success dark:text-success"
        : "text-foreground dark:text-foreground";

  // Barra lateral do card na cor da meta (como a "Taxa de Retenção" do
  // Consolidado); sem meta/sem dado, mantém --primary.
  const corBarra =
    tmaStatus === "danger" ? "var(--danger)" : tmaStatus === "success" ? "var(--success)" : "var(--primary)";

  return (
    <div data-visao-geral-cards className="grid grid-cols-1 gap-4 sm:grid-cols-5 sm:items-end">
      <div className="sm:col-span-2">
        <div className="relative flex h-full flex-col justify-center gap-2 overflow-hidden rounded-lg border border-border bg-card/70 p-6 shadow-[var(--shadow-sm)] backdrop-blur-md">
          <div aria-hidden="true" className="absolute top-0 left-0 h-full w-[3px]" style={{ background: corBarra }} />
          <p className="ds-small text-muted-foreground mb-1 tracking-wider uppercase">
            TMA
          </p>
          <p className={`ds-display tracking-tight text-5xl font-semibold tabular-nums ${tmaClassName}`}>
            {formatKpiValue(tmaMedioPonderado, "time")}
          </p>
        </div>
      </div>

      <div className="sm:col-span-3">
        <div className="flex h-full flex-col justify-center gap-1 rounded-lg border border-border bg-card/70 p-4 shadow-[var(--shadow-sm)] backdrop-blur-md">
          <p className="ds-small text-muted-foreground mb-1 tracking-wider uppercase">
            Atendidos
          </p>
          <p className="ds-display text-foreground flex items-baseline text-3xl font-semibold">
            <StaticNumber
              value={totalAtendidos}
              decimalPlaces={0}
              className="text-foreground tracking-tight dark:text-foreground"
            />
          </p>
        </div>
      </div>
    </div>
  );
}
