"use client";

import { useState } from "react";
import { IconCheck, IconFileTypePdf, IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";

import { domToPng } from "modern-screenshot";

interface ExportPdfButtonProps {
  /** Raiz do layout offscreen que contém os `[data-pdf-page="N"]`. */
  pagesRootRef: React.RefObject<HTMLDivElement | null>;
  filenameBase: string;
  disabled?: boolean;
}

function carregarImagem(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/** "rgb(255, 255, 255)" → [255,255,255]. Transparente/indefinido → branco. */
function parseRgb(s: string): [number, number, number] {
  const m = s.match(/-?\d*\.?\d+/g);
  if (!m || m.length < 3) return [255, 255, 255];
  // rgba(...,0) = transparente → não serve como cor de fundo, usa branco.
  if (m.length >= 4 && +m[3] === 0) return [255, 255, 255];
  return [Math.round(+m[0]), Math.round(+m[1]), Math.round(+m[2])];
}

/**
 * PDF = 4 imagens, uma por `[data-pdf-page]` do RelatorioPdfLayout (documento
 * HTML fiel ao template, com ComposedChart REAL dentro).
 *
 * UMA fonte de respiro só: `domToPng` é chamado direto (não via
 * `capturarComoPng`) SEM padding/style override — o `.sheet` mantém seus
 * 794px e seu próprio padding do template. Toda a margem física da página
 * vem do `addImage` centralizado (esquerda == direita por construção). O
 * fundo da página jsPDF é pintado com a MESMA cor do fundo do `.sheet`
 * (branco do template) para não haver costura entre papel e imagem.
 */
export function ExportPdfButton({
  pagesRootRef,
  filenameBase,
  disabled,
}: ExportPdfButtonProps) {
  const [state, setState] = useState<"idle" | "gerando" | "feito">("idle");

  async function handleClick() {
    const root = pagesRootRef.current;
    if (!root) {
      toast.error("Relatório não encontrado");
      return;
    }
    const paginas = Array.from(
      root.querySelectorAll<HTMLElement>("[data-pdf-page]"),
    );
    if (paginas.length === 0) {
      toast.error("Nada para exportar");
      return;
    }

    setState("gerando");
    try {
      await new Promise((r) => setTimeout(r, 500)); // gráficos assentam

      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      // Respiro físico entre a imagem e a borda do papel (pt), igual nos 4 lados.
      const MARGIN = 22;

      // Cor de fundo = a do próprio .sheet (branco do template) — pinta a
      // página inteira do jsPDF com ela pra margem não ter costura visível.
      const bgRgb = parseRgb(getComputedStyle(paginas[0]).backgroundColor);
      const bgCss = `rgb(${bgRgb[0]}, ${bgRgb[1]}, ${bgRgb[2]})`;

      for (let i = 0; i < paginas.length; i++) {
        if (i > 0) doc.addPage();

        // Captura crua: sem padding extra, sem override de style. O .sheet
        // ocupa exatamente seus 794px (com o padding interno do template).
        const el = paginas[i];
        const rect = el.getBoundingClientRect();
        const dataUrl = await domToPng(el, {
          scale: 2.5,
          backgroundColor: bgCss,
          width: Math.ceil(rect.width),
          height: Math.ceil(rect.height),
        });
        const img = await carregarImagem(dataUrl);

        // Fundo da página inteira na mesma cor.
        doc.setFillColor(bgRgb[0], bgRgb[1], bgRgb[2]);
        doc.rect(0, 0, pageW, pageH, "F");

        // Encaixa na área útil (página − 2·MARGIN), centralizada.
        const availW = pageW - MARGIN * 2;
        const availH = pageH - MARGIN * 2;
        const ratio = Math.min(availW / img.width, availH / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
        const x = (pageW - w) / 2;
        const y = (pageH - h) / 2;
        doc.addImage(dataUrl, "PNG", x, y, w, h);

        // Confirma programaticamente que as margens L/R são idênticas.
        const margemDir = pageW - x - w;
        if (Math.abs(x - margemDir) > 0.01) {
          console.warn(
            `[export-pdf] pág ${i + 1}: margem assimétrica L=${x.toFixed(3)} R=${margemDir.toFixed(3)}`,
          );
        } else {
          console.info(
            `[export-pdf] pág ${i + 1}: margem L=R=${x.toFixed(2)}pt`,
          );
        }
      }

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
