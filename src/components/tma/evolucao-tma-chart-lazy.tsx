"use client";

import dynamic from "next/dynamic";

import { EvolucaoSkeleton } from "@/components/dashboard/retencao/analitico-skeleton";

/**
 * EvolucaoTmaChart carregado sob demanda — mesmo padrão de
 * tma-detalhe-dialog-lazy.tsx. O Recharts (~120 KB gzip) saía no bundle
 * inicial da rota só por causa deste gráfico, que fica abaixo da dobra (no
 * trilho do Analítico). Enquanto o chunk chega, o EvolucaoSkeleton ocupa a
 * MESMA altura (título + legenda + 380px), sem pulo no trilho.
 *
 * ssr: false — o ResponsiveContainer do Recharts não desenha nada no
 * servidor (largura 0), então o SSR não ganhava nada além do título.
 */
export const EvolucaoTmaChart = dynamic(() => import("./evolucao-tma-chart").then((m) => m.EvolucaoTmaChart), {
  ssr: false,
  loading: () => <EvolucaoSkeleton />,
});
