"use client";

import { useState } from "react";
import { IconCamera, IconCheck, IconLoader2 } from "@tabler/icons-react";
import { domToPng } from "modern-screenshot";
import { toast } from "sonner";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function copyFormattedHtml(html: string): Promise<void> {
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
    console.warn("[copy-indisp] execCommand falhou, tentando ClipboardItem:", e);
  }

  await navigator.clipboard.write([
    new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
    }),
  ]);
}

interface CopyIndisponibilidadeButtonProps {
  horaReport: string;
  /** Nome do supervisor que fez o último report (BASE - 2!M2). */
  nomeSupervisorReport?: string | null;
}

export function CopyIndisponibilidadeButton({
  horaReport,
  nomeSupervisorReport,
}: CopyIndisponibilidadeButtonProps) {
  const [state, setState] = useState<"idle" | "copying" | "done">("idle");

  async function handleCopy() {
    const target = document.querySelector<HTMLElement>("[data-indisp-png]");
    if (!target) {
      toast.error("Tabela não encontrada");
      return;
    }

    setState("copying");

    try {
      const pngDataUrl = await domToPng(target, { scale: 3 });
      const hora =
        horaReport && horaReport !== "—"
          ? horaReport.match(/^(\d{1,2}:\d{2})/)?.[1] ?? horaReport
          : "—";
      const nome = nomeSupervisorReport?.trim();
      const textoReport = nome
        ? `O supervisor <b>${escapeHtml(nome)}</b> fez um report às ${escapeHtml(hora)}`
        : `report das ${escapeHtml(hora)}`;

      const html =
        `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">` +
        `<h2 style="font-size: 24px; margin: 0;"><b>INDISPONIBILIDADE</b></h2>` +
        `<div style="margin-top: 4px;"><i>${textoReport}</i></div>` +
        `<br>` +
        `<div style="margin-top: 8px;"><img src="${pngDataUrl}" style="display: block; max-width: 1000px; width: 100%;" alt="Tabela indisponibilidade"></div>` +
        `</div>`;

      await copyFormattedHtml(html);

      setState("done");
      toast.success("Tabela copiada", {
        description: "Cole no Teams, Slack ou email (Ctrl+V)",
        duration: 2500,
      });
      setTimeout(() => setState("idle"), 2000);
    } catch (err) {
      console.error("[copy-indisp] erro:", err);
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
      className="elevation-2 text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors"
      style={{ border: "1px solid var(--border)", fontSize: "12px" }}
    >
      {state === "copying" && (
        <>
          <IconLoader2 size={14} className="animate-spin" aria-hidden="true" />
          <span className="ds-mono-sm">Gerando...</span>
        </>
      )}
      {state === "done" && (
        <>
          <IconCheck
            size={14}
            style={{ color: "var(--success)" }}
            aria-hidden="true"
          />
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
