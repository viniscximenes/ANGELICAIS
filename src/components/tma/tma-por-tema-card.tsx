"use client";

import { useEffect, useState } from "react";

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

  // Barras crescem a partir de 0 ao montar (escalonadas por linha) — mesma
  // sensação de entrada suave das demais seções da página.
  const [montado, setMontado] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMontado(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="space-y-3">
      <div>
        <h3 className="ds-h3 font-semibold text-foreground">
          TMA por tema - Supervisor
        </h3>
        <p className="ds-small text-muted-foreground mt-1">
          Detalhamento do TMA médio de cada tema do consolidado da equipe.
        </p>
      </div>

      {/* Linhas separadas só por border/30 (sem hover — card de consulta),
          mesmo ritmo das tabelas do Analítico. */}
      <div data-tma-por-tema-lista className="divide-y divide-border/30">
        {SKILL_BUCKET_ORDER.map((bucket, idx) => {
          const valor = tmaPorBucketEquipe[bucket];
          const largura = valor !== null && maiorValor > 0 ? Math.min(100, (valor / maiorValor) * 100) : 0;
          const cor = cores[bucket];

          return (
            <div key={bucket} className="space-y-2 py-3 first:pt-1 last:pb-1">
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ background: valor !== null ? cor : "var(--muted-foreground)" }}
                  />
                  <span className="truncate text-xs font-semibold text-foreground">
                    {SKILL_BUCKET_LABELS[bucket]}
                  </span>
                </span>
                <span
                  className="shrink-0 text-xs font-semibold"
                  style={{
                    color: valor !== null ? cor : "var(--muted-foreground)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {valor !== null ? formatKpiValue(valor, "time") : "—"}
                </span>
              </div>

              <div
                data-tma-por-tema-trilho
                className="h-2 w-full overflow-hidden rounded-full"
              >
                {valor !== null && (
                  <div
                    className="h-full rounded-full transition-[width] duration-700 ease-out"
                    style={{
                      width: montado ? `${largura}%` : "0%",
                      transitionDelay: `${idx * 60}ms`,
                      background: `linear-gradient(90deg, color-mix(in oklch, ${cor} 55%, transparent), ${cor})`,
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
