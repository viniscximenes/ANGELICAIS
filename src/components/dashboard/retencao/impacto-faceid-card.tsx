"use client";

import { StaticNumber } from "@/components/ui/static-number";
import type { ImpactoFaceIdData } from "@/lib/retencao/get-impacto-faceid";

interface ImpactoFaceIdCardProps {
  data: ImpactoFaceIdData;
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
export function ImpactoFaceIdCard({ data }: ImpactoFaceIdCardProps) {
  const { total, naoRealizado, reprovado, porOperador } = data;

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="shrink-0">
        <h3 className="ds-h3 font-semibold text-foreground">
          Impacto do face ID no resultado
        </h3>
        <p className="ds-small text-muted-foreground mt-1">
          Tentativas de face ID não concluídas.
        </p>
      </div>

      {/*
        Mesmo visual dos cards da visão geral (Taxa de Retenção / Pedidos /
        Retidos / Churn, VisaoGeralCards com semAnimacao): mesmas caixas,
        mesmo fundo (data-visao-geral-cards puxa o tom do tema claro em
        reports-consolidado.css) e sem animação de entrada — o número já
        aparece pronto (StaticNumber), sem contar a partir de 0.
      */}
      <div
        data-visao-geral-cards
        className="shrink-0 grid grid-cols-1 gap-4 sm:grid-cols-5 sm:items-end"
      >
        <div className="sm:col-span-2">
          <div className="relative flex h-full flex-col justify-center gap-2 overflow-hidden rounded-lg border border-border bg-card/70 p-6 shadow-[var(--shadow-sm)] backdrop-blur-md">
            <p className="ds-small text-muted-foreground mb-1 tracking-wider uppercase">
              Tentativas de Face ID sem Sucesso
            </p>
            <p className="ds-display flex items-baseline text-5xl font-semibold text-foreground">
              <StaticNumber value={total} decimalPlaces={0} className="text-foreground tracking-tight dark:text-foreground" />
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:col-span-3">
          {[
            { id: "reprovado", label: "Reprovado", valor: reprovado },
            { id: "nao-realizado", label: "Não Realizado no Prazo", valor: naoRealizado },
          ].map((item) => (
            <div key={item.id}>
              <div className="flex h-full flex-col justify-center gap-1 rounded-lg border border-border bg-card/70 p-4 shadow-[var(--shadow-sm)] backdrop-blur-md">
                <p className="ds-small text-muted-foreground mb-1 tracking-wider uppercase">
                  {item.label}
                </p>
                <p className="ds-display text-foreground flex items-baseline text-3xl font-semibold">
                  <StaticNumber
                    value={item.valor}
                    decimalPlaces={0}
                    className="text-foreground tracking-tight dark:text-foreground"
                  />
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/*
        Tabela de operadores — mesmo padrão visual/dimensionamento de
        tabela-temas.tsx, sem container próprio (StyledCard removido a
        pedido), com rolagem vertical própria dentro do trilho.
      */}
      <div
        className="min-h-0 flex-1 overflow-y-auto scrollbar-tema"
      >
        {/* Sem o overflow-x-auto interno — ele viraria o
            container de rolagem do cabeçalho fixo (sticky) e ele não fixaria. */}
        <div>
          {/* data-tabela-faceid: cabeçalho no visual da tabela principal
              (reports-consolidado.css, junto com as demais tabelas).
              data-cabecalho-fixo: cabeçalho sticky ao rolar. */}
          <table data-tabela-faceid data-cabecalho-fixo className="w-full text-left border-collapse">
            <thead>
              <tr className="ds-body text-muted-foreground uppercase tracking-wide font-bold select-none border-b border-border/40 bg-muted/40">
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
                  // Sem hover: a linha não é clicável.
                  <tr key={op.nomeSobrenome}>
                    <td className="py-3 px-4 ds-body text-sm font-medium text-foreground whitespace-nowrap">
                      {op.nomeSobrenome}
                    </td>
                    <td
                      className="py-3 px-4 text-center ds-mono-sm text-sm !font-normal text-foreground"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {op.naoRealizado.toLocaleString("pt-BR")}
                    </td>
                    <td
                      className="py-3 px-4 text-center ds-mono-sm text-sm !font-normal text-foreground"
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
      </div>
    </div>
  );
}
