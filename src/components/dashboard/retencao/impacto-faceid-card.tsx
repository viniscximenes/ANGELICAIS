"use client";

import { BlurFade } from "@/components/ui/blur-fade";
import { NumberTicker } from "@/components/ui/number-ticker";
import { StyledCard } from "@/components/gestor/styled-card";
import type { ImpactoFaceIdData } from "@/lib/retencao/get-impacto-faceid";

interface ImpactoFaceIdCardProps {
  data: ImpactoFaceIdData;
  /** Ver comentário equivalente em tabela-temas.tsx — mesmo padrão de dimensionamento no trilho. */
  scrollInterno?: boolean;
}

/**
 * REDEFINIÇÃO (não incremento) da versão anterior deste card — a antiga
 * cruzava com o histórico global de FaceID pra decidir "excluído da
 * retenção" vs. "cancelado normalmente" (métricas de RESULTADO). Esta versão
 * mede TENTATIVAS de FaceID que não deram certo, sem cruzar com desfecho:
 * stat primário (total) + 2 secundários (Reprovado / Não Realizado no
 * Prazo, mesma técnica de hierarquia do card de Visão Geral) + tabela de
 * operadores da equipe com pelo menos 1 ocorrência (mesmo padrão visual de
 * tabela-temas.tsx).
 */
export function ImpactoFaceIdCard({ data, scrollInterno = false }: ImpactoFaceIdCardProps) {
  const { total, naoRealizado, reprovado, porOperador } = data;

  return (
    <div className={scrollInterno ? "flex h-full flex-col gap-6" : "flex flex-col gap-6"}>
      <div className={scrollInterno ? "shrink-0" : undefined}>
        <h3 className="ds-h3 font-semibold text-foreground">
          Impacto do Face ID no Resultado
        </h3>
        <p className="ds-small text-muted-foreground mt-1">
          Tentativas de Face ID não concluídas.
        </p>
      </div>

      <div className={scrollInterno ? "shrink-0 grid grid-cols-1 gap-4 sm:grid-cols-5 sm:items-end" : "grid grid-cols-1 gap-4 sm:grid-cols-5 sm:items-end"}>
        <BlurFade delay={0} inView className="sm:col-span-2">
          <div className="flex h-full flex-col justify-center gap-1 rounded-lg border border-border bg-card/70 p-6 shadow-[var(--shadow-sm)] backdrop-blur-md">
            <p className="ds-small text-muted-foreground mb-1 tracking-wider uppercase">
              Tentativas de Face ID sem Sucesso
            </p>
            <p className="ds-display flex items-baseline text-5xl font-semibold text-foreground">
              <NumberTicker value={total} decimalPlaces={0} delay={0.1} className="text-foreground" />
            </p>
          </div>
        </BlurFade>

        <div className="grid grid-cols-2 gap-4 sm:col-span-3">
          {[
            { id: "reprovado", label: "Reprovado", valor: reprovado },
            { id: "nao-realizado", label: "Não Realizado no Prazo", valor: naoRealizado },
          ].map((item, idx) => (
            <BlurFade key={item.id} delay={0.06 * (idx + 1)} inView>
              <div className="flex h-full flex-col justify-center gap-1 rounded-lg border border-border bg-card/70 p-4 shadow-[var(--shadow-sm)] backdrop-blur-md">
                <p className="ds-small text-muted-foreground mb-1 tracking-wider uppercase">
                  {item.label}
                </p>
                <p className="ds-display text-foreground flex items-baseline text-3xl font-semibold">
                  <NumberTicker
                    value={item.valor}
                    decimalPlaces={0}
                    delay={0.06 * (idx + 1) + 0.1}
                    className="text-foreground tracking-tight dark:text-foreground"
                  />
                </p>
              </div>
            </BlurFade>
          ))}
        </div>
      </div>

      {/*
        Tabela de operadores — mesmo padrão visual/dimensionamento de
        tabela-temas.tsx: StyledCard sem padding próprio, overflow-y-auto
        quando scrollInterno (dentro do trilho), fit-content fora dele.
      */}
      <StyledCard
        className={scrollInterno ? "min-h-0 flex-1 overflow-y-auto p-0 scrollbar-tema" : "p-0 overflow-hidden scrollbar-tema"}
        withGradient
        corners="all"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="ds-body text-muted-foreground uppercase tracking-wider text-[11px] font-bold select-none border-b border-border/40 bg-muted/40">
                <th className="py-2.5 px-4 font-bold whitespace-nowrap">Operador</th>
                <th className="py-2.5 px-4 font-bold text-center w-[150px] whitespace-nowrap">
                  Não Realizado
                </th>
                <th className="py-2.5 px-4 font-bold text-center w-[110px] whitespace-nowrap">
                  Reprovado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {porOperador.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-6 px-4 text-center text-muted-foreground text-xs">
                    Nenhuma tentativa de Face ID abortada hoje.
                  </td>
                </tr>
              ) : (
                porOperador.map((op) => (
                  <tr key={op.nomeSobrenome} className="hover:bg-accent transition-colors">
                    <td className="py-3 px-4 ds-body text-xs font-semibold text-foreground whitespace-nowrap">
                      {op.nomeSobrenome}
                    </td>
                    <td
                      className="py-3 px-4 text-center ds-mono-sm text-xs font-medium text-foreground"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {op.naoRealizado.toLocaleString("pt-BR")}
                    </td>
                    <td
                      className="py-3 px-4 text-center ds-mono-sm text-xs font-medium text-foreground"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {op.reprovado.toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Linha de total — mesmo padrão da linha "EQUIPE" da EquipeTable principal. */}
            {porOperador.length > 0 && (
              <tfoot>
                <tr
                  className="ds-body bg-muted/20 font-bold"
                  style={{ borderTop: "2px solid var(--border)" }}
                >
                  <td className="py-2.5 px-4 text-xs text-foreground tracking-wide whitespace-nowrap">
                    EQUIPE
                  </td>
                  <td
                    className="py-2.5 px-4 text-center text-xs text-foreground"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {naoRealizado.toLocaleString("pt-BR")}
                  </td>
                  <td
                    className="py-2.5 px-4 text-center text-xs text-foreground"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {reprovado.toLocaleString("pt-BR")}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </StyledCard>
    </div>
  );
}
