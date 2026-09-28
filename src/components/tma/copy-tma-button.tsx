"use client";

import { useState } from "react";
import { IconCamera, IconCheck, IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";

import { buildClipboardReportHtml } from "@/lib/gestor/build-clipboard-report-html";
import { capturarComoPng } from "@/lib/utils/capturar-como-png";
import { copyFormattedHtml, escapeHtml } from "@/lib/utils/copy-formatted-html";

interface CopyTmaButtonProps {
  horaReport: string;
}

export function CopyTmaButton({ horaReport }: CopyTmaButtonProps) {
  const [state, setState] = useState<"idle" | "copying" | "done">("idle");

  async function handleCopy() {
    const target = document.querySelector<HTMLElement>("[data-tma-png]");
    if (!target) {
      toast.error("Tabela não encontrada", { className: "reports-tma-peso-toast" });
      return;
    }

    setState("copying");

    try {
      const pngDataUrl = await capturarComoPng(target, { corDeFundoDoAlvo: true });
      const hora =
        horaReport && horaReport !== "—"
          ? horaReport.match(/^(\d{1,2}:\d{2})/)?.[1] ?? horaReport
          : "—";
      const textoReport = `report às ${escapeHtml(hora)}`;

      const html = buildClipboardReportHtml({
        titulo: "TMA",
        subtitulo: textoReport,
        pngDataUrl,
        altText: "Tabela TMA",
      });

      await copyFormattedHtml(html);

      // Toast de sucesso removido a pedido — o próprio botão já vira
      // "Copiado" (ícone + texto, ver estado "done" abaixo) por 2s, feedback
      // suficiente sem o popup extra. Mesmo ajuste já feito no Consolidado
      // (copy-table-button.tsx).
      setState("done");

      setTimeout(() => setState("idle"), 2000);
    } catch (err) {
      console.error("[copy-tma] erro:", err);
      setState("idle");
      toast.error("Não foi possível copiar", {
        description: "Tente em outro navegador (Chrome/Edge)",
        className: "reports-tma-peso-toast",
      });
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={state === "copying"}
      className="font-sans border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 inline-flex h-8 items-center justify-center gap-1.5 rounded-md border bg-transparent text-sm font-medium outline-none transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)] min-w-[140px] px-3"
    >
      {state === "copying" && (
        <span className="inline-flex items-center gap-1.5">
          <IconLoader2 size={14} className="animate-spin" aria-hidden="true" />
          <span>Gerando...</span>
        </span>
      )}
      {state === "done" && (
        <span className="inline-flex items-center gap-1.5" style={{ color: "var(--success)" }}>
          <IconCheck size={14} aria-hidden="true" />
          <span>Copiado</span>
        </span>
      )}
      {state === "idle" && (
        <span className="inline-flex items-center gap-1.5">
          <IconCamera size={14} aria-hidden="true" />
          <span>Copiar imagem</span>
        </span>
      )}
    </button>
  );
}
