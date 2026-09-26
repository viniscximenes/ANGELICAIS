"use client";

import { BlurFade } from "@/components/ui/blur-fade";
import { NumberTicker } from "@/components/ui/number-ticker";
import { formatKpiValue } from "@/lib/kpi/atual/format-kpi-value";
import type { TmaStatus } from "@/lib/tma/tma-status";

interface CardsResumoTmaProps {
  /** Média PONDERADA pelo volume (soma duracao_segundos ÷ total de atendimentos) — mesma fonte de totalAtendidos, nunca diverge. */
  tmaMedioPonderado: number | null;
  /** MESMO threshold/status que colore a tabela principal (getTmaThresholdConfig/statusTmaDe) — "neutral" (sem meta configurada ou sem dado) cai na cor padrão, sem tingir de verde/vermelho. */
  tmaStatus: TmaStatus;
  totalAtendidos: number;
}

/** Indicador principal e volume secundário: mesmas caixas neutras do Analítico do Consolidado. */
export function CardsResumoTma({ tmaMedioPonderado, tmaStatus, totalAtendidos }: CardsResumoTmaProps) {
  // Classes literais (não interpoladas) — mesma ressalva de VisaoGeralCards:
  // o scanner do Tailwind precisa achar a string inteira no código-fonte.
  const tmaClassName =
    tmaStatus === "danger"
      ? "text-danger dark:text-danger"
      : tmaStatus === "success"
        ? "text-success dark:text-success"
        : "text-foreground dark:text-foreground";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-5 sm:items-end">
      <BlurFade delay={0} inView className="sm:col-span-2">
        <div className="relative flex h-full flex-col justify-center gap-2 overflow-hidden rounded-lg border border-border bg-card/70 p-6 shadow-[var(--shadow-sm)] backdrop-blur-md">
          <div aria-hidden="true" className="absolute top-0 left-0 h-full w-[3px] bg-primary" />
          <p className="ds-small text-muted-foreground mb-1 tracking-wider uppercase">
            TMA
          </p>
          <p className={`ds-display tracking-tight text-5xl font-semibold tabular-nums ${tmaClassName}`}>
            {formatKpiValue(tmaMedioPonderado, "time")}
          </p>
        </div>
      </BlurFade>

      <BlurFade delay={0.06} inView className="sm:col-span-3">
        <div className="flex h-full flex-col justify-center gap-1 rounded-lg border border-border bg-card/70 p-4 shadow-[var(--shadow-sm)] backdrop-blur-md">
          <p className="ds-small text-muted-foreground mb-1 tracking-wider uppercase">
            Atendidos
          </p>
          <p className="ds-display text-foreground flex items-baseline text-3xl font-semibold">
            <NumberTicker
              value={totalAtendidos}
              decimalPlaces={0}
              delay={0.1}
              className="text-foreground tracking-tight dark:text-foreground"
            />
          </p>
        </div>
      </BlurFade>
    </div>
  );
}
