"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const IDLE_MS = 30 * 60 * 1000; // 30 minutos

/**
 * Recarrega a página após X minutos de inatividade do usuário.
 * Reseta o timer a cada movimento de mouse, tecla, scroll ou click.
 */
export function useIdleRefresh(idleMs: number = IDLE_MS) {
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    function resetTimer() {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        // Refresh server-side data sem perder estado client
        router.refresh();
      }, idleMs);
    }

    // Eventos que indicam atividade do usuário
    const events = ["mousemove", "keydown", "scroll", "click", "touchstart"];

    events.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    // Inicia o timer
    resetTimer();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [idleMs, router]);
}
