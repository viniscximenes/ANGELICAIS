"use client";

import { useLayoutEffect } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Ao (re)carregar a página, o navegador tenta restaurar a posição de
 * scroll anterior (ex.: meio do trilho do Analítico) — some com o
 * cabeçalho e a página abre "no meio". Desliga a restauração automática e
 * força o topo, só na página que usa o hook.
 *
 * Um scrollTo(0,0) único não basta: o navegador tenta RESTAURAR a posição
 * de novo enquanto a altura do documento cresce (dados client-side,
 * fontes, ScrollTrigger recalculando o pin), sem gancho JS pra saber
 * quando. Por isso uma "guarda" por alguns frames: a cada
 * requestAnimationFrame, se o scroll saiu de 0 sem o usuário ter mexido,
 * volta pro topo e chama ScrollTrigger.update() (só o PROGRESSO dos
 * triggers — .refresh() remediria o layout de todos e reflowava a página).
 * Desliga no primeiro gesto real (wheel/touch/tecla/clique) ou depois de
 * UNLOCK_MS — nunca prende um scroll manual. useLayoutEffect: a primeira
 * correção roda antes do primeiro paint, sem flash.
 */
export function useTopoAoCarregar() {
  useLayoutEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    const UNLOCK_MS = 2000;
    let active = true;
    let rafId = 0;

    const stop = () => {
      if (!active) return;
      active = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", stop);
      window.removeEventListener("pointerdown", stop);
      window.clearTimeout(timeoutId);
    };

    const tick = () => {
      if (!active) return;
      if (window.scrollY !== 0) {
        window.scrollTo(0, 0);
        ScrollTrigger.update();
      }
      rafId = requestAnimationFrame(tick);
    };

    window.scrollTo(0, 0);
    tick();

    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("keydown", stop);
    // Clique também é gesto real: um clique na navegação lateral (que rola
    // até a seção) ou na barra de rolagem nos primeiros 2s era desfeito pela
    // guarda, que puxava a página de volta pro topo.
    window.addEventListener("pointerdown", stop, { passive: true });
    const timeoutId = window.setTimeout(stop, UNLOCK_MS);

    return () => {
      stop();
      window.history.scrollRestoration = previous;
    };
  }, []);
}
