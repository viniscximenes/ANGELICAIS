"use client";

import { StyledCard } from "@/components/gestor/styled-card";
import { formatKpiValue } from "@/lib/kpi/atual/format-kpi-value";
import { SKILL_BUCKET_LABELS, SKILL_BUCKET_ORDER, type SkillBucket } from "@/lib/tma/skills-retencao";
import type { SkillColors } from "./use-skill-colors";

interface TmaPorTemaOperadorMiniProps {
  /** TMA médio (segundos) DESTE operador, por bucket — bucket sem atendimento: null. */
  tmaPorBucket: Record<SkillBucket, number | null>;
  /** MESMA paleta do donut ao lado (useSkillColors(), já resolvida pelo chamador) — cores batendo entre os dois cards. */
  cores: SkillColors;
}

/**
 * Versão compacta de TmaPorTemaCard (tma-por-tema-card.tsx, nível equipe),
 * pensada pra caber ao lado do donut dentro do modal (TmaDetalheDialog), não
 * como slide cheio do trilho — por isso SEM StyledCard's `corners`/gradiente
 * pesado, sem h3/ícone/descrição próprios (o rótulo "TMA por Tema" fica só
 * no <h4> que o dialog já usa pros outros blocos, igual "Evolução por Hora"
 * do Consolidado). Mesma técnica visual (rótulo + valor + barra fina
 * proporcional), reduzida em padding/gap pra caber ao lado do donut num
 * grid-cols-2 estreito.
 *
 * Bucket sem nenhum atendimento do operador: "—", sem barra — mesmo padrão
 * de TmaPorTemaCard/resto do projeto.
 */
export function TmaPorTemaOperadorMini({ tmaPorBucket, cores }: TmaPorTemaOperadorMiniProps) {
  const valores = SKILL_BUCKET_ORDER.map((b) => tmaPorBucket[b]).filter(
    (v): v is number => v !== null,
  );
  const maiorValor = valores.length > 0 ? Math.max(...valores) : 0;

  return (
    <StyledCard className="p-3.5 space-y-2.5" withGradient>
      {SKILL_BUCKET_ORDER.map((bucket) => {
        const valor = tmaPorBucket[bucket];
        const largura = valor !== null && maiorValor > 0 ? Math.min(100, (valor / maiorValor) * 100) : 0;
        const cor = cores[bucket];

        return (
          <div key={bucket} className="space-y-1">
            <div className="flex items-baseline justify-between text-[11px]">
              <span className="font-semibold text-foreground tracking-tight truncate pr-2">
                {SKILL_BUCKET_LABELS[bucket]}
              </span>
              <span
                className="ds-mono-sm shrink-0 font-semibold"
                style={{ color: valor !== null ? cor : undefined }}
              >
                {valor !== null ? formatKpiValue(valor, "time") : <span className="text-muted-foreground">—</span>}
              </span>
            </div>

            <div className="h-1 w-full bg-muted/40 rounded-full overflow-hidden">
              {valor !== null && (
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${largura}%`, background: cor }}
                />
              )}
            </div>
          </div>
        );
      })}
    </StyledCard>
  );
}
