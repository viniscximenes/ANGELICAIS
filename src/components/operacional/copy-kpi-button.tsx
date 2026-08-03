"use client";

import { useState } from "react";
import { IconCamera, IconCheck, IconLoader2 } from "@tabler/icons-react";
import { domToPng } from "modern-screenshot";
import { toast } from "sonner";

import { buildClipboardReportHtml } from "@/lib/gestor/build-clipboard-report-html";
import { formatDateBR } from "@/lib/utils/format-datetime-br";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function copyFormattedHtml(html: string): Promise<void> {
  // Tenta execCommand primeiro — preserva estilos inline (sem sanitização)
  try {
    const container = document.createElement("div");
    container.setAttribute("contenteditable", "true");
    container.style.position = "fixed";
    container.style.top = "-9999px";
    container.style.left = "-9999px";
    container.style.whiteSpace = "pre-wrap";
    container.innerHTML = html;
    document.body.appendChild(container);

    const range = document.createRange();
    range.selectNodeContents(container);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
      const ok = document.execCommand("copy");
      selection.removeAllRanges();
      document.body.removeChild(container);
      if (ok) return;
    } else {
      document.body.removeChild(container);
    }
  } catch (e) {
    console.warn("[copy-kpi] execCommand falhou, tentando ClipboardItem:", e);
  }

  // Fallback: ClipboardItem (sem garantia de cores em todos os browsers)
  await navigator.clipboard.write([
    new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
    }),
  ]);
}

interface CopyKpiButtonProps {
  /** Data de corte dos dados (mesRef não tem precisão de dia) — vira o subtítulo "atualizado até DD/MM/YYYY". */
  dataCorte: string | null;
}

/**
 * Copia a tabela de KPI (offscreen, [data-kpi-tabela-png]) como imagem —
 * mesmo mecanismo e mesmo padrão visual de CopyTableButton (D-1
 * Consolidado) / CopyTempoLogadoButton / CopyIndisponibilidadeButton:
 * título + subtítulo como TEXTO (via buildClipboardReportHtml), a imagem
 * capturada é só a tabela (sem título embutido nela).
 */
export function CopyKpiButton({ dataCorte }: CopyKpiButtonProps) {
  const [state, setState] = useState<"idle" | "copying" | "done">("idle");

  async function handleCopy() {
    const target = document.querySelector<HTMLElement>("[data-kpi-tabela-png]");

    if (!target) {
      toast.error("Tabela não encontrada");
      return;
    }

    setState("copying");

    try {
      const pngDataUrl = await domToPng(target, { scale: 3 });
      const subtitulo = dataCorte
        ? `atualizado até ${escapeHtml(formatDateBR(dataCorte))}`
        : "—";

      const html = buildClipboardReportHtml({
        titulo: "TABELA DO KPI",
        subtitulo,
        pngDataUrl,
        altText: "Tabela do KPI",
      });

      await copyFormattedHtml(html);

      setState("done");
      toast.success("Tabela copiada", {
        description: "Cole no Teams, Slack ou email (Ctrl+V)",
        duration: 2500,
      });

      setTimeout(() => setState("idle"), 2000);
    } catch (err) {
      console.error("[copy-kpi] erro:", err);
      setState("idle");
      toast.error("Não foi possível copiar", {
        description: "Tente em outro navegador (Chrome/Edge)",
      });
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={state === "copying"}
      className="bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-opacity cursor-pointer shadow-sm disabled:opacity-50"
      style={{ fontSize: "12px" }}
    >
      {state === "copying" && (
        <>
          <IconLoader2 size={14} className="animate-spin" aria-hidden="true" />
          <span className="ds-mono-sm">Gerando...</span>
        </>
      )}
      {state === "done" && (
        <>
          <IconCheck size={14} style={{ color: "var(--success)" }} aria-hidden="true" />
          <span className="ds-mono-sm">Copiado</span>
        </>
      )}
      {state === "idle" && (
        <>
          <IconCamera size={14} aria-hidden="true" />
          <span className="ds-mono-sm">Copiar como imagem</span>
        </>
      )}
    </button>
  );
}
