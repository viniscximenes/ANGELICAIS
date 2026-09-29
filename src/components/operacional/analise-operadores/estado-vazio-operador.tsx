"use client";

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
}

export function EstadoVazioOperador({ kpisPreview, periodo }: Props) {
  const nMeses = MESES_JANELA[periodo];

  return (
    <div className="space-y-8">
      {/*
        Seleção de operador agora é o botão à direita do cabeçalho
        (analise-operadores-section.tsx) — só o aviso para leitor de tela
        fica aqui; os cards fantasma abaixo são aria-hidden.
      */}
      <p className="sr-only">
        Selecione um operador para ver o histórico completo.
      </p>

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
