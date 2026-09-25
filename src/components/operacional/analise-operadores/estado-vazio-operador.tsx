"use client";

import type { ReactNode } from "react";
import { IconUserSearch } from "@tabler/icons-react";

import { MESES_JANELA, type Periodo } from "@/lib/kpi/analise-operadores/periodo";
import type { KpisPreview } from "@/lib/kpi/analise-operadores/serial-types";

import {
  GhostIdentificacaoBloco,
  GhostKpiCard,
  GhostSecundarioCard,
} from "./relatorio-fantasma";

/**
 * Estado vazio de /kpi/evolucao (sem operador selecionado) — uma PRÉVIA da
 * estrutura real do relatório (mesmos cards, mesma ordem, vindos de
 * `getKpisPreview()` em serial-types.ts, sem lista hardcoded duplicada),
 * com valores "fantasma" (?/—) no lugar dos números reais. Troca a antiga
 * caixa tracejada vazia por algo que já mostra o que a página oferece.
 *
 * Tudo aqui é decorativo — `aria-hidden` no bloco de cards fantasma (não é
 * informação real, não deveria ser lido como se fosse); só a mensagem de
 * chamada à ação (fora do bloco aria-hidden) é anunciada por leitor de
 * tela, deixando claro que é um estado vazio aguardando seleção.
 */

interface Props {
  kpisPreview: KpisPreview;
  periodo: Periodo;
  /**
   * O popover de seleção de operador inteiro (trigger + busca + lista) já
   * montado pelo pai (analise-operadores-section.tsx). Só existe aqui
   * quando NÃO há operador selecionado — uma vez selecionado, o controle
   * de troca vive no cabeçalho da página, nunca os dois ao mesmo tempo.
   */
  seletorOperador: ReactNode;
}

export function EstadoVazioOperador({
  kpisPreview,
  periodo,
  seletorOperador,
}: Props) {
  const nMeses = MESES_JANELA[periodo];

  return (
    <div className="space-y-8">
      {/*
        Única parte NÃO decorativa desta seção — é o que o leitor de tela
        efetivamente anuncia. O resto (cards fantasma abaixo) é
        aria-hidden: não é dado real, não deveria ser lido como se fosse.
      */}
      <div className="border-border/60 bg-muted/20 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-dashed px-5 py-4">
        <div className="flex items-center gap-3">
          <IconUserSearch
            size={20}
            className="text-muted-foreground shrink-0"
            aria-hidden="true"
          />
          <div>
            <p className="text-foreground text-sm font-semibold">
              Selecione um operador para ver o histórico completo
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              A prévia abaixo mostra a estrutura do relatório — os números
              somem assim que você escolhe alguém da equipe.
            </p>
          </div>
        </div>
        {seletorOperador}
      </div>

      <div aria-hidden="true" className="space-y-8">
        <GhostIdentificacaoBloco />

        <div className="space-y-10">
          {kpisPreview.principais.map((k) => (
            <GhostKpiCard
              key={k.slug}
              nome={k.displayName}
              nMeses={nMeses}
              mensagem="Sem operador selecionado"
            />
          ))}
        </div>

        {kpisPreview.secundarios.length > 0 && (
          <div className="space-y-3">
            <p className="text-muted-foreground/60 flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
              KPIs secundários ({kpisPreview.secundarios.length})
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {kpisPreview.secundarios.map((k) => (
                <GhostSecundarioCard key={k.slug} nome={k.displayName} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
