"use client";

import { forwardRef } from "react";

import { formatKpiValue } from "@/lib/kpi/atual/format-kpi-value";
import type { AnaliseOperadorSerial } from "@/lib/kpi/analise-operadores/serial-types";

import {
  IdentificacaoBloco,
  type IdentificacaoMeta,
} from "./identificacao-bloco";
import { KpiPrincipalCard } from "./kpi-principal-card";
import { KpiSecundariosGrid } from "./kpi-secundarios-grid";

const LARGURA_PAGINA_PX = 794; // ~A4 @ 96dpi

/**
 * Layout offscreen (position:fixed; left:-99999px) usado só pela exportação
 * PDF: cada filho `[data-pdf-page]` é capturado separadamente como imagem e
 * colado numa página do PDF (jsPDF), para não gerar uma única imagem
 * gigante. Largura fixa pra as imagens terem proporção previsível.
 *
 * Página 1: identificação + mini-resumo. Uma página por KPI principal.
 * Última: KPIs secundários.
 */
export const RelatorioPdfLayout = forwardRef<
  HTMLDivElement,
  { data: AnaliseOperadorSerial; meta: IdentificacaoMeta }
>(function RelatorioPdfLayout({ data, meta }, ref) {
  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        position: "fixed",
        left: "-99999px",
        top: 0,
        width: `${LARGURA_PAGINA_PX}px`,
        backgroundColor: "var(--background)",
      }}
    >
      <div data-pdf-page className="space-y-6 p-8">
        <IdentificacaoBloco meta={meta} />
        <div className="grid grid-cols-2 gap-3">
          {data.principais.map((serie) => {
            const ultimo = [...serie.pontos]
              .reverse()
              .find((p) => p.valor !== null);
            return (
              <div
                key={serie.slug}
                className="border-border/50 rounded border p-3"
              >
                <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                  {serie.displayName}
                </p>
                <p className="text-foreground ds-display text-base font-semibold tabular-nums">
                  {ultimo && ultimo.valor !== null
                    ? formatKpiValue(ultimo.valor, serie.valueType)
                    : "—"}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {data.principais.map((serie) => (
        <div key={serie.slug} data-pdf-page className="p-8">
          <KpiPrincipalCard serie={serie} estatico />
        </div>
      ))}

      <div data-pdf-page className="p-8">
        <KpiSecundariosGrid series={data.secundarios} forcarAberto />
      </div>
    </div>
  );
});
