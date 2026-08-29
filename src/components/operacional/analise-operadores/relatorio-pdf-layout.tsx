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

const LARGURA_PAGINA_PX = 880;

/**
 * Layout offscreen (position:fixed; left:-99999px) que serve às DUAS
 * exportações:
 *  - PNG: captura a raiz inteira (imagem única, contínua).
 *  - PDF: captura cada filho `[data-pdf-page]` como uma página.
 *
 * `data-theme="light"` na raiz força o tema claro (aciona os overrides de
 * globals.css) — é o que sempre aparece no PNG/PDF final. `forceLight`
 * propaga isso para as cores do Recharts (que não herdam `var()` do
 * `[data-theme]` quando o SVG é serializado). `estatico` desliga animação
 * para a captura não pegar um frame intermediário.
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
      data-theme="light"
      style={{
        position: "fixed",
        left: "-99999px",
        top: 0,
        width: `${LARGURA_PAGINA_PX}px`,
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      <div
        data-pdf-page
        className="space-y-6 p-8"
        style={{ backgroundColor: "var(--background)" }}
      >
        <IdentificacaoBloco meta={meta} />
        <div className="grid grid-cols-2 gap-3">
          {data.principais.map((serie) => {
            const validos = serie.pontos
              .map((p) => p.valor)
              .filter((v): v is number => v !== null);
            const media =
              validos.length > 0
                ? validos.reduce((a, b) => a + b, 0) / validos.length
                : null;
            return (
              <div
                key={serie.slug}
                className="border-border/50 rounded border p-3"
              >
                <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                  {serie.displayName}
                </p>
                <p className="text-foreground ds-display text-base font-semibold tabular-nums">
                  {media !== null
                    ? `${formatKpiValue(media, serie.valueType)}`
                    : "—"}
                  <span className="text-muted-foreground ml-1 text-[10px] font-normal">
                    média
                  </span>
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {data.principais.map((serie) => (
        <div
          key={serie.slug}
          data-pdf-page
          className="p-8"
          style={{ backgroundColor: "var(--background)" }}
        >
          <KpiPrincipalCard serie={serie} estatico forceLight />
        </div>
      ))}

      <div
        data-pdf-page
        className="p-8"
        style={{ backgroundColor: "var(--background)" }}
      >
        <KpiSecundariosGrid series={data.secundarios} forcarAberto forceLight />
      </div>
    </div>
  );
});
