"use client";

import { useState } from "react";
import { IconCheck, IconFileTypePdf, IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";
import type { CellInput, RowInput } from "jspdf-autotable";

import { formatKpiValue } from "@/lib/kpi/atual/format-kpi-value";
import type {
  AnaliseOperadorSerial,
  KpiSerie,
  PontoSerie,
} from "@/lib/kpi/analise-operadores/serial-types";
import {
  calcularTendencia,
  rotuloTendencia,
} from "@/lib/kpi/analise-operadores/tendencia";
import { capturarComoPng } from "@/lib/utils/capturar-como-png";

import type { IdentificacaoMeta } from "./identificacao-bloco";
import { resolverCoresPdf, type CoresPdf } from "./pdf-cores";

interface ExportPdfButtonProps {
  data: AnaliseOperadorSerial | null;
  meta: IdentificacaoMeta;
  /** Raiz do layout offscreen com os `[data-pdf-chart="<slug>"]`. */
  chartsRootRef: React.RefObject<HTMLDivElement | null>;
  filenameBase: string;
  disabled?: boolean;
}

// ── helpers de dados ────────────────────────────────────────────────
function mediaDe(pontos: PontoSerie[]): number | null {
  const v = pontos
    .map((p) => p.valorPlot)
    .filter((x): x is number => x !== null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}
function ultimoPlotado(pontos: PontoSerie[]): PontoSerie | undefined {
  return [...pontos].reverse().find((p) => p.valorPlot !== null);
}
function mesesExcluidos(
  data: AnaliseOperadorSerial,
): { label: string; motivo: string }[] {
  const base = data.principais[0]?.pontos ?? data.secundarios[0]?.pontos ?? [];
  return base
    .filter((p) => p.metaStatusRotulo !== null)
    .map((p) => ({ label: p.label, motivo: p.metaStatusRotulo as string }));
}

// ── células coloridas (autotable RowInput) ─────────────────────────
function celulaQuartil(q: 1 | 2 | 3 | 4 | null, c: CoresPdf): CellInput {
  if (!q) return { content: "—", styles: { halign: "center" } };
  const map = {
    1: { fill: c.successBg, text: c.success },
    2: { fill: c.warningBg, text: c.warning },
    3: { fill: c.laranjaBg, text: c.laranja },
    4: { fill: c.dangerBg, text: c.danger },
  } as const;
  const m = map[q];
  return {
    content: `Q${q}`,
    styles: {
      halign: "center",
      fontStyle: "bold",
      fillColor: m.fill,
      textColor: m.text,
    },
  };
}
function celulaStatus(
  status: PontoSerie["status"],
  c: CoresPdf,
): CellInput {
  const map = {
    success: { fill: c.successBg, text: c.success, txt: "Na meta" },
    warning: { fill: c.warningBg, text: c.warning, txt: "Atenção" },
    danger: { fill: c.dangerBg, text: c.danger, txt: "Fora" },
    neutral: null,
  } as const;
  const m = map[status];
  if (!m) return { content: "—", styles: { halign: "center" } };
  return {
    content: m.txt,
    styles: {
      halign: "center",
      fontStyle: "bold",
      fillColor: m.fill,
      textColor: m.text,
    },
  };
}
function celulaMotivo(motivo: string, c: CoresPdf): CellInput {
  return {
    content: motivo,
    styles: {
      halign: "center",
      fontStyle: "italic",
      textColor: c.warning,
    },
  };
}

export function ExportPdfButton({
  data,
  meta,
  chartsRootRef,
  filenameBase,
  disabled,
}: ExportPdfButtonProps) {
  const [state, setState] = useState<"idle" | "gerando" | "feito">("idle");

  async function handleClick() {
    if (!data) return;
    setState("gerando");
    try {
      await new Promise((r) => setTimeout(r, 450)); // deixa os gráficos assentarem

      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
      const W = doc.internal.pageSize.getWidth();
      const HH = doc.internal.pageSize.getHeight();
      const M = 40;
      const CW = W - M * 2;
      const c = resolverCoresPdf();

      const detailPages = Math.ceil(data.principais.length / 2);
      const totalPages = 1 + detailPages + 1;

      const finalY = () =>
        (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
          .finalY;

      const chrome = (pageNum: number) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(...c.foreground);
        doc.text("Relatório de performance", M, M + 2);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(...c.muted);
        doc.text(
          `${meta.operador}   ·   ${meta.periodoLabel} (${meta.intervalo})`,
          M,
          M + 17,
        );
        doc.setDrawColor(...c.border);
        doc.setLineWidth(0.75);
        doc.line(M, M + 26, W - M, M + 26);

        doc.setFontSize(7.5);
        doc.setTextColor(...c.muted);
        doc.text(
          `Gerado por ${meta.gestorNome} — ${meta.geradoEm}`,
          M,
          HH - M + 16,
        );
        doc.text(`Página ${pageNum}/${totalPages}`, W - M, HH - M + 16, {
          align: "right",
        });
      };

      const styleBase = {
        font: "helvetica" as const,
        fontSize: 8,
        cellPadding: 3.5,
        textColor: c.foreground,
        lineColor: c.border,
        lineWidth: 0.5,
      };
      const headStyle = {
        fillColor: c.headerBg,
        textColor: c.foreground,
        fontStyle: "bold" as const,
        fontSize: 7.5,
      };

      // ═══════════ PÁGINA 1 — Capa / Resumo executivo ═══════════
      chrome(1);
      let y = M + 46;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...c.foreground);
      doc.text("Resumo executivo", M, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...c.muted);
      doc.text(
        `Operador: ${meta.operador}    Meses no período: ${data.meses.length}    Intervalo: ${meta.intervalo}`,
        M,
        y,
      );
      y += 12;

      const resumoBody: RowInput[] = data.principais.map((serie) => {
        const media = mediaDe(serie.pontos);
        const ult = ultimoPlotado(serie.pontos);
        const tend = calcularTendencia(serie.pontos);
        return [
          serie.displayName,
          media !== null ? formatKpiValue(media, serie.valueType) : "—",
          serie.metaLinha !== null
            ? formatKpiValue(serie.metaLinha, serie.valueType)
            : "—",
          celulaQuartil(ult?.quartil ?? null, c),
          rotuloTendencia(tend),
        ];
      });

      autoTable(doc, {
        startY: y,
        head: [
          [
            "KPI",
            "Média do período",
            "Meta",
            "Quartil (mês recente)",
            "Tendência",
          ],
        ],
        body: resumoBody,
        margin: { left: M, right: M },
        tableWidth: CW,
        styles: styleBase,
        headStyles: headStyle,
        alternateRowStyles: { fillColor: c.zebra },
        columnStyles: {
          1: { halign: "right" },
          2: { halign: "right" },
          3: { halign: "center" },
          4: { halign: "center" },
        },
      });

      const excl = mesesExcluidos(data);
      if (excl.length) {
        let ny = finalY() + 16;
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(...c.muted);
        const texto = `${excl.length} mês(es) excluído(s) do cálculo (média e quartil): ${excl
          .map((e) => `${e.label} — ${e.motivo}`)
          .join("; ")}.`;
        for (const linha of doc.splitTextToSize(texto, CW) as string[]) {
          doc.text(linha, M, ny);
          ny += 11;
        }
      }

      // ═══════════ PÁGINAS DE DETALHE — 2 KPIs por página ═══════════
      const halfTop = M + 44;
      const halfBottom = HH / 2 + 8;

      for (let pi = 0; pi < detailPages; pi++) {
        doc.addPage();
        chrome(2 + pi);
        const kpis = data.principais.slice(pi * 2, pi * 2 + 2);

        for (let hi = 0; hi < kpis.length; hi++) {
          const serie = kpis[hi];
          const hy = hi === 0 ? halfTop : halfBottom;

          doc.setFont("helvetica", "bold");
          doc.setFontSize(10.5);
          doc.setTextColor(...c.foreground);
          doc.text(serie.displayName, M, hy + 10);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(...c.muted);
          doc.text(
            serie.metaLinha !== null
              ? `Meta: ${formatKpiValue(serie.metaLinha, serie.valueType)}`
              : "Sem meta definida",
            M,
            hy + 22,
          );

          // gráfico (imagem — só a área de plotagem)
          const el = chartsRootRef.current?.querySelector<HTMLElement>(
            `[data-pdf-chart="${serie.slug}"]`,
          );
          const imgW = 306;
          const imgH = 110;
          if (el) {
            const url = await capturarComoPng(el, { scale: 3, padding: 0 });
            doc.addImage(url, "PNG", M, hy + 28, imgW, imgH);
          }

          // tabela de dados (nativa) — substitui o tooltip da tela
          const body: RowInput[] = serie.pontos.map((p) => {
            const motivo = p.metaStatusRotulo;
            return [
              p.label,
              p.valor !== null ? formatKpiValue(p.valor, serie.valueType) : "—",
              motivo ? celulaMotivo(motivo, c) : celulaStatus(p.status, c),
              motivo
                ? { content: "—", styles: { halign: "center" } }
                : serie.temQuartil
                  ? celulaQuartil(p.quartil, c)
                  : { content: "—", styles: { halign: "center" } },
            ];
          });

          autoTable(doc, {
            startY: hy + 28 + imgH + 8,
            head: [["Mês", "Valor", "Status", "Quartil"]],
            body,
            margin: { left: M, right: M },
            tableWidth: CW,
            styles: { ...styleBase, fontSize: 7.5, cellPadding: 2.5 },
            headStyles: { ...headStyle, fontSize: 7 },
            columnStyles: {
              1: { halign: "right" },
              2: { halign: "center" },
              3: { halign: "center" },
            },
          });
        }
      }

      // ═══════════ PÁGINA FINAL — KPIs secundários ═══════════
      doc.addPage();
      chrome(totalPages);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...c.foreground);
      doc.text("KPIs secundários", M, M + 46);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...c.muted);
      doc.text("Valor do mês mais recente (não-afastado).", M, M + 58);

      const secBody: RowInput[] = data.secundarios.map((serie: KpiSerie) => {
        const ult = ultimoPlotado(serie.pontos);
        const tend = calcularTendencia(serie.pontos);
        return [
          serie.displayName,
          ult && ult.valor !== null
            ? formatKpiValue(ult.valor, serie.valueType)
            : "—",
          ult ? celulaStatus(ult.status, c) : { content: "—" },
          rotuloTendencia(tend),
        ];
      });

      autoTable(doc, {
        startY: M + 68,
        head: [["KPI", "Valor (mês recente)", "Status", "Tendência"]],
        body: secBody,
        margin: { left: M, right: M },
        tableWidth: CW,
        styles: styleBase,
        headStyles: headStyle,
        alternateRowStyles: { fillColor: c.zebra },
        columnStyles: {
          1: { halign: "right" },
          2: { halign: "center" },
          3: { halign: "center" },
        },
      });

      doc.save(`${filenameBase}.pdf`);
      setState("feito");
      toast.success("PDF baixado");
      setTimeout(() => setState("idle"), 2000);
    } catch (err) {
      console.error("[analise-operadores/export-pdf] erro:", err);
      setState("idle");
      toast.error("Não foi possível gerar o PDF");
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || state === "gerando"}
      className="border-border bg-background text-foreground hover:bg-muted flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 shadow-sm transition-colors disabled:opacity-50"
      style={{ fontSize: "12px" }}
    >
      {state === "gerando" ? (
        <IconLoader2 size={14} className="animate-spin" aria-hidden="true" />
      ) : state === "feito" ? (
        <IconCheck
          size={14}
          style={{ color: "var(--success)" }}
          aria-hidden="true"
        />
      ) : (
        <IconFileTypePdf size={14} aria-hidden="true" />
      )}
      <span className="ds-mono-sm">Baixar PDF</span>
    </button>
  );
}
