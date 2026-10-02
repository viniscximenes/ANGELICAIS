// Suspense fallback de /s/bases/kpi (F5) — mesmo padrão do loading.tsx de
// /s/reports/consolidado: mesmo wrapper/paddings/fonte de page.tsx e
// skeleton nas posições reais. Fica na tela por no mínimo MIN_LOADING_MS
// (piso aplicado em page.tsx).
import { Instrument_Sans } from "next/font/google";

import "./bases-kpi.css";
import { BasesKpiSkeleton } from "@/components/bases-kpi/bases-kpi-skeleton";

const zenSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--font-zen-sans",
});

export default function LoadingBasesKpi() {
  return (
    <div
      data-page="bases-kpi"
      className={`min-h-screen px-6 py-8 lg:px-12 lg:py-12 ${zenSans.variable}`}
    >
      <BasesKpiSkeleton />
    </div>
  );
}
