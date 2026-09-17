"use client";

import { useEffect, useState } from "react";

import type { SkillBucket } from "@/lib/tma/skills-retencao";
import { resolverTokenCss } from "@/lib/utils/resolver-token-css";

const CSS_VAR: Record<SkillBucket, string> = {
  outros: "--tma-outros",
  criticos: "--tma-criticos",
  mudEndereco: "--tma-mud-endereco",
  financeiro: "--tma-financeiro",
  qualidade: "--tma-qualidade",
  concorrencia: "--tma-concorrencia",
  hotlineChurn: "--tma-hotline-churn",
};

const FALLBACK: Record<SkillBucket, string> = {
  outros: "#71717a",
  criticos: "#dc2626",
  mudEndereco: "#d97706",
  financeiro: "#16a34a",
  qualidade: "#2563eb",
  concorrencia: "#9333ea",
  hotlineChurn: "#db2777",
};

export type SkillColors = Record<SkillBucket, string> & {
  /**
   * Fundo do modal (--background), resolvido — usado como `stroke` das
   * fatias do Pie. O Recharts pinta o stroke padrão em branco fixo, o que
   * cria um contorno branco berrante no tema escuro; usar a cor de fundo
   * real faz as fatias "se separarem" pela mesma cor do fundo, em vez de um
   * branco hardcoded que só funciona no tema claro.
   */
  surface: string;
};

const FALLBACK_SURFACE = "#0a0a0a";

/**
 * Paleta FIXA skill → cor (donut/legenda do modal de detalhamento do TMA) —
 * mesmo mapeamento pra qualquer gestor, com tokens de tema dedicados
 * (--tma-*, ver globals.css) pra ter tons ajustados no claro/escuro sem
 * gerar cor dinamicamente.
 */
export function useSkillColors(): SkillColors {
  const [cores, setCores] = useState<SkillColors>({ ...FALLBACK, surface: FALLBACK_SURFACE });

  useEffect(() => {
    const next = { ...FALLBACK, surface: FALLBACK_SURFACE } as SkillColors;
    (Object.keys(CSS_VAR) as SkillBucket[]).forEach((k) => {
      next[k] = resolverTokenCss(CSS_VAR[k], FALLBACK[k]);
    });
    next.surface = resolverTokenCss("--background", FALLBACK_SURFACE);
    setCores(next);
  }, []);

  return cores;
}
