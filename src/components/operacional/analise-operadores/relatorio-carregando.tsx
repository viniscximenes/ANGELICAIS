"use client";

import { IconLoader2 } from "@tabler/icons-react";

import { MESES_JANELA, type Periodo } from "@/lib/kpi/analise-operadores/periodo";
import type { KpisPreview } from "@/lib/kpi/analise-operadores/serial-types";

import {
  GhostIdentificacaoBloco,
  GhostKpiCard,
  GhostSecundarioCard,
} from "./relatorio-fantasma";

/**
 * Loading ao selecionar/trocar operador em /kpi/evolucao — mesmos cards
 * "fantasma" do estado vazio (relatorio-fantasma.tsx), só troca o banner
 * de cima ("Carregando…", com spinner) e a mensagem sobreposta ao
 * gráfico. Substitui TANTO o relatório anterior QUANTO o placeholder do
 * estado vazio enquanto a troca está em andamento — nenhum dos dois
 * aparece misturado com a nova seleção.
 *
 * Não é o `KpiLoadingScreen` (esse é o Suspense fallback de NAVEGAÇÃO de
 * rota, em loading.tsx — cobre entrar na página, não trocar operador
 * dentro dela). Também não reintroduz aquele problema: só aparece depois
 * que a página já carregou e o usuário interage, nunca no lugar do
 * fallback de navegação.
 */
export function RelatorioCarregando({
  kpisPreview,
  periodo,
  nomeOperador,
}: {
  kpisPreview: KpisPreview;
  periodo: Periodo;
  nomeOperador: string;
}) {
  const nMeses = MESES_JANELA[periodo];

  return (
    <div className="space-y-8">
      {/*
        role="status" + aria-live: o que o leitor de tela anuncia ao entrar
        e ao sair deste estado (a troca pro relatório real, fora daqui,
        já é conteúdo normal — não precisa de anúncio extra).
      */}
      <div
        role="status"
        aria-live="polite"
        className="border-border/60 bg-muted/20 flex items-center gap-3 rounded-lg border border-dashed px-5 py-4"
      >
        <IconLoader2
          size={20}
          className="text-muted-foreground shrink-0 animate-spin"
          aria-hidden="true"
        />
        <p className="text-foreground text-sm font-semibold">
          Carregando dados de {nomeOperador}…
        </p>
      </div>

      <div aria-hidden="true" className="space-y-8">
        <GhostIdentificacaoBloco />

        <div className="space-y-10">
          {kpisPreview.principais.map((k) => (
            <GhostKpiCard
              key={k.slug}
              nome={k.displayName}
              nMeses={nMeses}
              mensagem="Carregando…"
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
