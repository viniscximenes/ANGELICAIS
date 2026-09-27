import { Instrument_Sans } from "next/font/google";

import "./operacao-comparativo-consolidado.css";
import { KpiLoadingScreen } from "@/components/gestor/kpi-loading-screen";

const zenSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--font-zen-sans",
});

export default function LoadingComparativoConsolidado() {
  return (
    <div className={zenSans.variable}>
      <KpiLoadingScreen
        dataPage="operacao-comparativo-consolidado"
        titulo="Comparativo Consolidado"
        formato="comparativo"
        showActionsRow={false}
        indicatorPosition="after-header"
      />
    </div>
  );
}
