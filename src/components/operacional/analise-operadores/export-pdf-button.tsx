"use client";

import { useState } from "react";
import { IconCheck, IconFileTypePdf, IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";

import { capturarComoPng } from "@/lib/utils/capturar-como-png";

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

/**
 * PDF = 4 imagens, uma por `[data-pdf-page]` do RelatorioPdfLayout (documento
 * HTML fiel ao template, com ComposedChart REAL dentro). Cada página é
 * capturada inteira via `capturarComoPng` e colada com jsPDF `addImage`
 * ocupando a página A4. Sem jspdf-autotable, sem doc.text() de conteúdo.
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
      // Respiro físico entre a imagem e a borda do papel (pt). ~22pt ≈ 29px
      // no equivalente de 794px do componente. Igual em todas as páginas.
      const MARGIN = 22;

      for (let i = 0; i < paginas.length; i++) {
        if (i > 0) doc.addPage();
        const dataUrl = await capturarComoPng(paginas[i], {
          scale: 2.5,
          padding: 0,
        });
        const img = await carregarImagem(dataUrl);
        // A imagem tem ~proporção A4 (794×1123). Encaixa dentro da área útil
        // (página menos as 4 margens), centralizada.
        const availW = pageW - MARGIN * 2;
        const availH = pageH - MARGIN * 2;
        const ratio = Math.min(availW / img.width, availH / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
        doc.addImage(dataUrl, "PNG", (pageW - w) / 2, (pageH - h) / 2, w, h);
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
