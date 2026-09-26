import { Instrument_Sans } from "next/font/google";

import "./operacao-diario.css";
import { KpiLoadingScreen } from "@/components/gestor/kpi-loading-screen";

const zenSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--font-zen-sans",
});

export default function LoadingOperacaoDiario() {
  return (
    <div className={zenSans.variable}>
      <KpiLoadingScreen
        dataPage="operacao-diario"
        titulo="Diário"
        formato="diario"
        indicatorPosition="after-header"
        showActionsRow={false}
      />
    </div>
  );
}
