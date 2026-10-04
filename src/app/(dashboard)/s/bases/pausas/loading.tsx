// Suspense fallback de /s/bases/pausas (F5) — mesmo padrão de /s/bases/kpi:
// mesmo wrapper/paddings/fonte de page.tsx e skeleton nas posições reais.
// Fica na tela por no mínimo MIN_LOADING_MS (piso aplicado em page.tsx).
import { Instrument_Sans } from "next/font/google";

import "./bases-pausas.css";
import { BasesPausasSkeleton } from "@/components/bases-pausas/bases-pausas-skeleton";

const zenSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--font-zen-sans",
});

export default function LoadingBasesPausas() {
  return (
    <div
      data-page="bases-pausas"
      className={`min-h-screen px-6 py-8 lg:px-12 lg:py-12 ${zenSans.variable}`}
    >
      <BasesPausasSkeleton />
    </div>
  );
}
