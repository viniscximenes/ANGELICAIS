import "../../../reports/consolidado/reports-consolidado.css";
import { DotSpinner } from "@/components/gestor/dot-spinner";

export default function LoadingCoordenadorConsolidado() {
  return (
    <div
      data-page="reports-consolidado"
      className="flex min-h-[70vh] items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <DotSpinner />
      <span className="sr-only">Carregando Consolidado, aguarde.</span>
    </div>
  );
}
