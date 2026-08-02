"use client";

import { useEffect, useRef, type ComponentType } from "react";

import FloatingLinesComponent from "@/components/FloatingLines";

// FloatingLines é um componente .jsx sem tipos próprios (instalado via
// `shadcn add @react-bits/FloatingLines-JS-CSS`); todas as props que o
// componente de fato usa (via `??`/optional chaining) são opcionais em
// runtime, então tipamos aqui só o que este arquivo consome.
const FloatingLines = FloatingLinesComponent as ComponentType<{
  linesGradient?: string[];
  animationSpeed?: number;
  interactive?: boolean;
  bendRadius?: number;
  bendStrength?: number;
  mouseDamping?: number;
  parallax?: boolean;
  parallaxStrength?: number;
}>;

export function LoginFloatingBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // FloatingLines (não modificado) escuta pointermove/pointerleave
    // diretamente no seu <canvas>. Como o canvas fica em z-0, atrás do card
    // do formulário (z-10), o navegador nunca entrega esses eventos a ele
    // quando o cursor está sobre o card — hit-testing sempre escolhe o
    // elemento no topo do empilhamento. `window`/`document` recebem TODO
    // evento de ponteiro independente de qual elemento foi hit-tested, então
    // redisparamos um evento sintético equivalente direto no canvas real.
    // Isso não intercepta nem consome nada: os listeners aqui só observam o
    // evento que já ia acontecer normalmente, sem overlay e sem tocar em
    // pointer-events de ninguém — cliques no formulário continuam 100%
    // nativos.
    let canvas: HTMLCanvasElement | null = null;
    const getCanvas = () => {
      if (!canvas || !canvas.isConnected) {
        canvas = container.querySelector("canvas");
      }
      return canvas;
    };

    const forwardPointerMove = (event: PointerEvent) => {
      getCanvas()?.dispatchEvent(
        new PointerEvent("pointermove", {
          clientX: event.clientX,
          clientY: event.clientY,
          pointerId: event.pointerId,
          pointerType: event.pointerType,
        }),
      );
    };

    const forwardPointerLeave = () => {
      getCanvas()?.dispatchEvent(new PointerEvent("pointerleave"));
    };

    window.addEventListener("pointermove", forwardPointerMove);
    // pointerleave não borbulha; registrado direto em `document`, dispara
    // quando o cursor sai de fato da viewport (equivalente a sair do canvas,
    // já que o canvas cobre 100% dela).
    document.addEventListener("pointerleave", forwardPointerLeave);

    return () => {
      window.removeEventListener("pointermove", forwardPointerMove);
      document.removeEventListener("pointerleave", forwardPointerLeave);
    };
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 z-0 h-screen w-screen" aria-hidden="true">
      <FloatingLines
        linesGradient={["#113211", "#2a3727", "#6a6a6a"]}
        animationSpeed={1.3}
        interactive
        bendRadius={8}
        bendStrength={-4.5}
        mouseDamping={0.05}
        parallax
        parallaxStrength={0.2}
      />
    </div>
  );
}
