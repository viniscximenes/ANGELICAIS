"use client";

import { IconChartBar } from "@tabler/icons-react";

import { StyledCard } from "@/components/gestor/styled-card";
import { formatKpiValue } from "@/lib/kpi/atual/format-kpi-value";
import { SKILL_BUCKET_LABELS, SKILL_BUCKET_ORDER, type SkillBucket } from "@/lib/tma/skills-retencao";
import { useSkillColors } from "./use-skill-colors";

interface TmaPorTemaCardProps {
  /** TMA médio (segundos) de TODA a equipe, por bucket — bucket sem nenhum atendimento: null. */
  tmaPorBucketEquipe: Record<SkillBucket, number | null>;
}

/**
 * Card "TMA por Tema" (nível de equipe) — mesmo padrão visual de
 * TabelaSegmentos (dashboard/retencao/tabela-segmentos.tsx): StyledCard +
 * lista de linhas (rótulo + valor à direita + barra horizontal fina
 * proporcional logo abaixo). Não existe nenhum componente de
 * "distribuição/ranking por categoria" em nível de equipe fora do padrão de
 * TabelaSegmentos — reaproveitado aqui em vez de inventar um novo.
 *
 * Critério da barra: MAIOR TMA = barra mais LONGA (mesmo sentido direto de
 * TabelaSegmentos, onde maior tx = barra mais longa) — a barra representa o
 * valor em si, não um "quanto falta pra meta". Largura relativa ao MAIOR
 * valor entre os 7 buckets (não a uma escala fixa, já que segundos não têm
 * teto natural de 100% como uma taxa).
 *
 * Cor de cada barra: useSkillColors() — MESMA paleta do donut de
 * tma-detalhe-dialog.tsx (tokens --tma-*), pra ficar consistente entre o
 * modal de detalhe por operador e este card de equipe.
 *
 * Sempre mostra os 7 buckets (nunca esconde linha) — bucket sem nenhum
 * atendimento na equipe inteira: "—", sem barra.
 */
export function TmaPorTemaCard({ tmaPorBucketEquipe }: TmaPorTemaCardProps) {
  const cores = useSkillColors();

  const valores = SKILL_BUCKET_ORDER.map((b) => tmaPorBucketEquipe[b]).filter(
    (v): v is number => v !== null,
  );
  const maiorValor = valores.length > 0 ? Math.max(...valores) : 0;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="ds-h3 font-semibold text-foreground flex items-center gap-2">
          <IconChartBar size={20} className="text-foreground" />
          TMA por Tema (Gestor)
        </h3>
        <p className="ds-small text-muted-foreground mt-1">
          TMA médio da equipe em cada categoria de atendimento, na base atual.
        </p>
      </div>

      <StyledCard className="p-4 space-y-3.5" withGradient corners="all">
        {SKILL_BUCKET_ORDER.map((bucket) => {
          const valor = tmaPorBucketEquipe[bucket];
          const largura = valor !== null && maiorValor > 0 ? Math.min(100, (valor / maiorValor) * 100) : 0;
          const cor = cores[bucket];

          return (
            <div key={bucket} className="space-y-1.5">
              <div className="flex justify-between items-baseline text-xs">
                <span className="font-semibold text-foreground tracking-tight">
                  {SKILL_BUCKET_LABELS[bucket]}
                </span>
                <span
                  className="font-mono font-semibold text-xs"
                  style={{ color: valor !== null ? cor : undefined }}
                >
                  {valor !== null ? (
                    formatKpiValue(valor, "time")
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </span>
              </div>

              <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden">
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
    </div>
  );
}
