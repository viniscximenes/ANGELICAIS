"use client";

import { useEffect } from "react";
import { BProgress } from "@bprogress/core";

import { startFaviconLoading, stopFaviconLoading } from "@/lib/favicon/favicon-loading";

/**
 * Liga o favicon animado ("carregando") enquanto a barra de progresso do
 * bprogress estiver ativa — cobre navegação entre páginas (e, por extensão,
 * o carregamento de cada rota: é a mesma barra que já aparece no topo,
 * ProgressBarProvider em layout.tsx).
 *
 * Não há evento/callback público do bprogress pra "começou"/"terminou"
 * (ProgressProvider instrumenta o router do Next por dentro, sem expor
 * hooks de início/fim) — por isso este componente faz polling de
 * `BProgress.isStarted()` (flag estática do pacote, leitura барata, sem
 * DOM) no mesmo intervalo que o favicon já usa pra redesenhar (80ms):
 * junto com o favicon-loading.ts, é praticamente o mesmo custo de já ter
 * a animação rodando.
 *
 * [verificar] Isso cobre a navegação entre páginas e qualquer loading que
 * o bprogress já capture; NÃO cobre o carregamento inicial da página antes
 * do JS do React hidratar — nenhum favicon controlado por client-side JS
 * consegue animar antes do bundle carregar e este componente montar (o
 * navegador mostra o favicon estático normal nesse intervalo, inevitável).
 *
 * Montado uma única vez em layout.tsx (dentro de ProgressBarProvider).
 * Não renderiza nada.
 */
export function FaviconNavigationBridge() {
  useEffect(() => {
    let ativo = false;

    const interval = setInterval(() => {
      const iniciado = BProgress.isStarted();
      if (iniciado && !ativo) {
        ativo = true;
        startFaviconLoading();
      } else if (!iniciado && ativo) {
        ativo = false;
        stopFaviconLoading();
      }
    }, 80);

    return () => {
      clearInterval(interval);
      // Se desmontar (não deveria acontecer — é montado uma vez na raiz)
      // com a navegação ainda em curso, libera o pedido pra não vazar o
      // contador do favicon-loading.
      if (ativo) stopFaviconLoading();
    };
  }, []);

  return null;
}
