"use client";

import { useEffect, useRef, type ComponentType } from "react";

import TopographyComponent from "@/components/Topography";
import { useTheme } from "@/components/dashboard/theme-provider";
import type { PaletteId } from "@/lib/theme/palettes";

// Topography é um componente .jsx sem tipos próprios (React Bits, variante
// JS + CSS); tipamos aqui só as props que este arquivo usa.
const Topography = TopographyComponent as ComponentType<{
  lowColor?: string;
  midColor?: string;
  highColor?: string;
  speed?: number;
  morphAmount?: number;
  bands?: number;
  thickness?: number;
  glow?: number;
  contrast?: number;
  opacity?: number;
  grain?: boolean;
  grainIntensity?: number;
  mouseInteraction?: boolean;
  mouseRadius?: number;
  mouseStrength?: number;
}>;

/**
 * Cores das curvas de nível por paleta e modo (baixa → média → alta).
 * O lightMode do componente não é usado: ele pinta o canvas opaco de branco
 * e normaliza a cor pelo pico — os cinzas da Vercel sumiriam. No claro as
 * linhas saem em alpha (como no escuro), só que em tons escuros, sobre o
 * bg-background da página.
 */
const CORES: Record<PaletteId, Record<"dark" | "light", [string, string, string]>> = {
  vercel: {
    dark: ["#3B3B3B", "#5C5A56", "#A89F8F"],
    light: ["#B5B5B5", "#8A8A8A", "#4D4D4D"],
  },
  "claude-amber": {
    dark: ["#4E4D48", "#B05730", "#D97757"],
    light: ["#C9B8A8", "#D97757", "#B05730"],
  },
};

export function LoginFloatingBackground() {
  const { theme, palette } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Topography (não modificado) escuta mousemove/mouseleave direto no seu
    // <canvas>. Como o canvas fica em z-0, atrás do card do formulário
    // (z-10), o navegador nunca entrega esses eventos a ele quando o cursor
    // está sobre o card. `window`/`document` recebem todo evento de mouse,
    // então redisparamos um evento sintético equivalente no canvas real —
    // só observando, sem overlay nem pointer-events: cliques no formulário
    // continuam nativos.
    let canvas: HTMLCanvasElement | null = null;
    const getCanvas = () => {
      if (!canvas || !canvas.isConnected) {
        canvas = container.querySelector("canvas");
      }
      return canvas;
    };

    const forwardMouseMove = (event: MouseEvent) => {
      getCanvas()?.dispatchEvent(
        new MouseEvent("mousemove", { clientX: event.clientX, clientY: event.clientY }),
      );
    };

    const forwardMouseLeave = () => {
      getCanvas()?.dispatchEvent(new MouseEvent("mouseleave"));
    };

    window.addEventListener("mousemove", forwardMouseMove);
    // mouseleave não borbulha; em `document` dispara quando o cursor sai da
    // viewport (o canvas cobre 100% dela).
    document.addEventListener("mouseleave", forwardMouseLeave);

    return () => {
      window.removeEventListener("mousemove", forwardMouseMove);
      document.removeEventListener("mouseleave", forwardMouseLeave);
    };
  }, []);

  const [low, mid, high] = CORES[palette][theme];

  return (
    <div ref={containerRef} className="fixed inset-0 z-0 h-screen w-screen" aria-hidden="true">
      <Topography
        lowColor={low}
        midColor={mid}
        highColor={high}
        speed={0.35}
        morphAmount={3.0}
        bands={2.0}
        thickness={0.01}
        glow={0.5}
        contrast={3.0}
        opacity={theme === "light" ? 0.35 : 0.4}
        grain
        grainIntensity={0.05}
        mouseInteraction
        mouseRadius={0.3}
        mouseStrength={0.4}
      />
    </div>
  );
}
