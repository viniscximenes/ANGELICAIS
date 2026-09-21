"use client";

import { useState } from "react";
import { IconCamera, IconCheck, IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";

import { buildClipboardReportHtml } from "@/lib/gestor/build-clipboard-report-html";
import { capturarComoPng } from "@/lib/utils/capturar-como-png";
import { copyFormattedHtml, escapeHtml } from "@/lib/utils/copy-formatted-html";

interface CopyTempoIndispButtonProps {
  horaReport: string;
}

/**
 * Botão único "Copiar como imagem" da seção Tempo Logado & Indisponibilidade
 * — substitui os dois botões antigos (um por tabela). Mesmo rótulo/ícone/
 * estados do CopyTableButton do consolidado. Captura o wrapper offscreen
 * único ([data-tempo-indisp-png]), que já força o nome fantasia (não recebe
 * olhoAberto) — ver comentário em tempo-indisp-section.tsx.
 */
export function CopyTempoIndispButton({ horaReport }: CopyTempoIndispButtonProps) {
  const [state, setState] = useState<"idle" | "copying" | "done">("idle");

  async function handleCopy() {
    const target = document.querySelector<HTMLElement>("[data-tempo-indisp-png]");
    if (!target) {
      toast.error("Tabela não encontrada");
      return;
    }

    setState("copying");

    try {
      const pngDataUrl = await capturarComoPng(target);
      const hora =
        horaReport && horaReport !== "—"
          ? horaReport.match(/^(\d{1,2}:\d{2})/)?.[1] ?? horaReport
          : "—";
      const textoReport = `report às ${escapeHtml(hora)}`;

      const html = buildClipboardReportHtml({
        titulo: "D-1 TEMPO LOGADO & INDISPONIBILIDADE",
        subtitulo: textoReport,
        pngDataUrl,
        altText: "Tabela tempo logado e indisponibilidade",
      });

      await copyFormattedHtml(html);

      setState("done");
      toast.success("Tabela copiada", {
        description: "Cole no Teams, Slack ou email (Ctrl+V)",
        duration: 2500,
      });
      setTimeout(() => setState("idle"), 2000);
    } catch (err) {
      console.error("[copy-tempo-indisp] erro:", err);
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
