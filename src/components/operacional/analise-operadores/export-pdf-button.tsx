"use client";

import { useState } from "react";
import { IconCheck, IconFileTypePdf, IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";

import { capturarComoPng } from "@/lib/utils/capturar-como-png";

import type { IdentificacaoMeta } from "./identificacao-bloco";

interface ExportPdfButtonProps {
  /** Raiz do layout offscreen que contém os filhos [data-pdf-page]. */
  pagesRootRef: React.RefObject<HTMLDivElement | null>;
  meta: IdentificacaoMeta;
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
 * PDF gerado 100% no client (plano Vercel Free — sem Puppeteer): captura
 * cada `[data-pdf-page]` como imagem via `capturarComoPng` e cola uma por
 * página com jsPDF. Sem renderizar HTML dentro da lib — só colagem de
 * imagens. Cabeçalho/rodapé = apenas dados e metadados de geração
 * (auditoria), nada avaliativo.
 */
export function ExportPdfButton({
  pagesRootRef,
  meta,
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
      // Deixa os gráficos offscreen assentarem.
      await new Promise((r) => setTimeout(r, 500));

      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });

      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 32;
      const headerH = 44;
      const footerH = 24;

      for (let i = 0; i < paginas.length; i++) {
        if (i > 0) doc.addPage();

        const dataUrl = await capturarComoPng(paginas[i], {
          scale: 2,
          padding: 0,
        });
        const img = await carregarImagem(dataUrl);

        const availW = pageW - margin * 2;
        const availH = pageH - margin * 2 - headerH - footerH;
        const ratio = Math.min(availW / img.width, availH / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
        const x = (pageW - w) / 2;
        const y = margin + headerH;

        // Cabeçalho (dados)
        doc.setTextColor(30);
        doc.setFontSize(12);
        doc.text(
          `Relatório de performance — ${meta.operador}`,
          margin,
          margin + 12,
        );
        doc.setTextColor(120);
        doc.setFontSize(8);
        doc.text(
          `Período: ${meta.periodoLabel} · ${meta.intervalo}`,
          margin,
          margin + 26,
        );

        doc.addImage(dataUrl, "PNG", x, y, w, h);

        // Rodapé (metadados de geração — auditoria)
        doc.setTextColor(120);
        doc.setFontSize(7);
        doc.text(
          `Gerado por ${meta.gestorNome} · ${meta.geradoEm}`,
          margin,
          pageH - margin + 2,
        );
        doc.text(`Página ${i + 1}/${paginas.length}`, pageW - margin, pageH - margin + 2, {
          align: "right",
        });
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
