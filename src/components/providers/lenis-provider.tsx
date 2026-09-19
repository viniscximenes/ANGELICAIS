"use client";

import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { setLenisInstance } from "@/lib/lenis/lenis-instance";

gsap.registerPlugin(ScrollTrigger);

export function LenisProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    // Expõe a instância pra código fora do provider (ex: atalho de teclado
    // de setas em gestor-equipe-section.tsx) poder usar lenis.scrollTo em
    // vez de scroll nativo — ver comentário em lib/lenis/lenis-instance.ts.
    setLenisInstance(lenis);

    // Sincroniza o Lenis com o ScrollTrigger: a cada scroll do lenis,
    // recalcula o estado do ScrollTrigger (padrão oficial documentado em
    // https://github.com/darkroomengineering/lenis/discussions/140).
    lenis.on("scroll", ScrollTrigger.update);

    // Lenis passa a rodar dentro do próprio ticker do GSAP (em vez do loop
    // manual de requestAnimationFrame) para os dois ficarem no mesmo frame.
    // `time * 1000`: gsap.ticker entrega segundos, lenis.raf espera ms.
    // Os args (false, true) fazem o raf do lenis rodar ANTES das animações
    // do GSAP no mesmo tick, evitando reflow/recalculo de estilo duplicado.
    const lenisTick = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(lenisTick, false, true);

    // Desliga o lag smoothing do GSAP: ele pausa/acelera animações depois de
    // um frame lento pra "recuperar o atraso", o que briga com o próprio
    // smoothing do lenis e gera dessincronia entre scroll e animação.
    gsap.ticker.lagSmoothing(0);

    return () => {
      setLenisInstance(null);
      gsap.ticker.remove(lenisTick);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
