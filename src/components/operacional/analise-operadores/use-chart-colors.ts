"use client";

import { useEffect, useState } from "react";

export type ChartColors = {
  success: string;
  danger: string;
  warning: string;
  border: string;
  mutedFg: string;
  background: string;
  primary: string;
};

const FALLBACK: ChartColors = {
  success: "#16a34a",
  danger: "#dc2626",
  warning: "#d97706",
  border: "#3f3f46",
  mutedFg: "#71717a",
  background: "#0a0a0a",
  primary: "#2563eb",
};

const TOKENS: (keyof ChartColors)[] = [
  "success",
  "danger",
  "warning",
  "border",
  "mutedFg",
  "background",
  "primary",
];

const CSS_VAR: Record<keyof ChartColors, string> = {
  success: "--success",
  danger: "--danger",
  warning: "--warning",
  border: "--border",
  mutedFg: "--muted-foreground",
  background: "--background",
  primary: "--primary",
};

/**
 * Lê os tokens do tema CLARO (`[data-theme="light"]` de globals.css) a partir
 * de um elemento-sonda destacado — sem tocar em `<html>` nem no tema da
 * sessão. Usado na captura PNG/PDF, que é sempre forçada em tema claro.
 */
function lerTokensTemaClaro(): ChartColors {
  if (typeof document === "undefined") return FALLBACK;
  const probe = document.createElement("div");
  probe.setAttribute("data-theme", "light");
  probe.style.display = "none";
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const cores = { ...FALLBACK };
  for (const t of TOKENS) {
    cores[t] = cs.getPropertyValue(CSS_VAR[t]).trim() || FALLBACK[t];
  }
  probe.remove();
  return cores;
}

/**
 * Lê os tokens já resolvidos no elemento `[data-page="kpi-evolucao"]` — não
 * em `document.documentElement`. Esta página tem tema Zen Linen escopado por
 * `[data-page]` (ver kpi-evolucao.css); ler do `<html>` pegaria os tokens
 * GLOBAIS do site (outro tema), não os desta rota. Cai pro FALLBACK se o
 * elemento ainda não montou.
 */
function lerTokensDaPagina(): ChartColors {
  if (typeof document === "undefined") return FALLBACK;
  const raiz = document.querySelector<HTMLElement>('[data-page="kpi-evolucao"]');
  if (!raiz) return FALLBACK;
  const cs = getComputedStyle(raiz);
  const cores = { ...FALLBACK };
  for (const t of TOKENS) {
    cores[t] = cs.getPropertyValue(CSS_VAR[t]).trim() || FALLBACK[t];
  }
  return cores;
}

/**
 * Cores do tema já RESOLVIDAS (valor computado, não `var(--x)`) — os gráficos
 * deste relatório são serializados isoladamente num <img> pela exportação
 * PNG/PDF, e `var()` não resolve dentro do SVG nesse contexto (mesmo motivo
 * do tratamento em retencao/operador-detalhe-dialog.tsx).
 *
 * @param forceLight quando true, resolve contra os tokens de `[data-theme="light"]`
 * (a captura sempre sai em tema claro), independente do tema da sessão.
 */
export function useChartColors(forceLight = false): ChartColors {
  // Lido já no 1º render: os gráficos só montam no client (depois de
  // selecionar operador), então o tema já está no DOM. Antes começava no
  // FALLBACK e trocava pras cores do tema num render seguinte — a cor do
  // gráfico "chegava depois".
  const [cores, setCores] = useState<ChartColors>(() =>
    forceLight ? lerTokensTemaClaro() : lerTokensDaPagina(),
  );

  useEffect(() => {
    setCores(forceLight ? lerTokensTemaClaro() : lerTokensDaPagina());
  }, [forceLight]);

  return cores;
}
