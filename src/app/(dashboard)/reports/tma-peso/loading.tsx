import "./reports-tma-peso.css";

import { KpiLoadingScreen } from "@/components/gestor/kpi-loading-screen";

export default function LoadingReportsTmaPeso() {
  return (
    <KpiLoadingScreen
      dataPage="reports-tma-peso"
      titulo="TMA & Peso"
      formato="tma-peso"
      indicatorPosition="after-header"
    />
  );
}
