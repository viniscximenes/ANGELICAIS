"use client";

import { forwardRef } from "react";

import type { AnaliseOperadorSerial } from "@/lib/kpi/analise-operadores/serial-types";

import { PdfChart } from "./pdf-chart";

/**
 * Layout offscreen (position:fixed; left:-99999px) que renderiza SÓ os
 * gráficos compactos dos KPIs principais, um por `[data-pdf-chart="<slug>"]`,
 * em tema claro forçado. O ExportPdfButton captura cada um como imagem — o
 * resto do PDF (capa, tabelas, textos) é desenhado nativo com jsPDF/autotable.
 */
export const PdfChartsLayout = forwardRef<
  HTMLDivElement,
  { data: AnaliseOperadorSerial }
>(function PdfChartsLayout({ data }, ref) {
  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-theme="light"
      style={{
        position: "fixed",
        left: "-99999px",
        top: 0,
        backgroundColor: "#ffffff",
        color: "#18181b",
      }}
    >
      {data.principais.map((serie) => (
        <div
          key={serie.slug}
          data-pdf-chart={serie.slug}
          style={{ width: 500, height: 180, backgroundColor: "#ffffff" }}
        >
          <PdfChart serie={serie} />
        </div>
      ))}
    </div>
  );
});
