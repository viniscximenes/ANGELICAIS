"use client";

import { BlurFade } from "@/components/ui/blur-fade";
import { NumberTicker } from "@/components/ui/number-ticker";
import { StyledCard } from "@/components/gestor/styled-card";
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
 * 2 cards grandes lado a lado (TMA + Atendidos) — mesmo padrão visual dos
 * cards de resumo do Tempo-Indisp (StyledCard + BlurFade, cantoneiras
 * left/right), sem os médios (só 2 números pra esta seção) e sem seletor de
 * período (a página não tem um — mostra sempre a base atual, mesmo padrão do
 * Consolidado/Tempo-Indisp).
 *
 * Cor do card "TMA": MESMO padrão já usado pelos outros cards grandes de
 * resumo do projeto (VisaoGeralCards no Consolidado, CardsResumoAnalitico no
 * Tempo-Indisp) — recolore só o TEXTO do valor (text-success/text-danger),
 * sem tingir o fundo do card. Não inventei um padrão novo: os dois exemplos
 * existentes já fazem exatamente isso pro card grande com meta.
 *
 * "TMA" usa formatKpiValue(..., "time") — MESMO formatador já usado em
 * tma-table.tsx/tma-detalhe-dialog.tsx, sem criar formatador novo.
 * "Atendidos" é NumberTicker puro (inteiro, sem cor de status — é volume,
 * não tem meta), igual ao card equivalente do dialog de detalhe da TMA
 * (tma-detalhe-dialog.tsx).
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

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-end">
      <BlurFade delay={0} inView>
        <StyledCard className="flex h-full flex-col justify-center px-6 py-5" withGradient corners="left">
          <p className="ds-small text-muted-foreground/80 mb-2 text-xs font-semibold tracking-wider uppercase">
            TMA
          </p>
          <p className={`ds-display tracking-tight text-4xl xl:text-5xl font-bold tabular-nums ${tmaClassName}`}>
            {formatKpiValue(tmaMedioPonderado, "time")}
          </p>
        </StyledCard>
      </BlurFade>

      <BlurFade delay={0.06} inView>
        <StyledCard className="flex h-full flex-col justify-center px-6 py-5" withGradient corners="right">
          <p className="ds-small text-muted-foreground/80 mb-2 text-xs font-semibold tracking-wider uppercase">
            Atendidos
          </p>
          <p className="ds-display flex items-baseline tracking-tight text-4xl xl:text-5xl font-bold text-foreground">
            <NumberTicker
              value={totalAtendidos}
              decimalPlaces={0}
              delay={0.1}
              className="text-foreground tracking-tight dark:text-foreground"
            />
          </p>
        </StyledCard>
      </BlurFade>
    </div>
  );
}
