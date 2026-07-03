"use client";

import { useState } from "react";
import { IconCamera, IconCheck, IconLoader2 } from "@tabler/icons-react";
import { domToPng } from "modern-screenshot";
import { toast } from "sonner";

import type { OperadorConsolidado, ResumoEquipe } from "@/lib/google/d1";

function getHoraReport(equipe: ResumoEquipe): string {
  if (!equipe.horaReport || equipe.horaReport === "—") return "—";
  // Se a hora contiver segundos (ex: 15:30:00), corta e deixa apenas HH:MM
  const match = equipe.horaReport.match(/^(\d{1,2}:\d{2})/);
  return match ? match[1] : equipe.horaReport;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatReportTexto(hora: string, nomeSupervisor?: string | null): string {
  const nome = nomeSupervisor?.trim();
  if (nome) {
    return `O supervisor <b>${escapeHtml(nome)}</b> fez um report às ${escapeHtml(hora)}`;
  }
  return `report das ${escapeHtml(hora)}`;
}

function formatReportHtml(
  hora: string,
  nomeSupervisor: string | null | undefined,
  pngDataUrl: string,
): string {
  // Blocos empilhados verticalmente, nesta ordem: título → report → imagem.
  // O Teams Web strippa font-size de <div>/<span>, mas RESPEITA font-size em
  // <h2> — por isso o título grande precisa ser <h2> (e o negrito via <b>, que
  // o Teams nunca remove). O report é um <div> (bloco) com <i> dentro: o div
  // garante a quebra de linha e o <i> o itálico. A <img> fica em bloco com
  // display:block (+ <br> de reforço) para não fluir ao lado do texto.
  const parts: string[] = [
    `<h2 style="font-size: 24px; margin: 0;"><b>D-1 CONSOLIDADO</b></h2>`,
    `<div style="margin-top: 4px;"><i>${formatReportTexto(hora, nomeSupervisor)}</i></div>`,
    `<br>`,
    `<div style="margin-top: 8px;"><img src="${pngDataUrl}" style="display: block; max-width: 1000px; width: 100%;" alt="Tabela consolidado"></div>`,
  ];
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">${parts.join("")}</div>`;
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
    console.warn(
      "[copy-table] execCommand falhou, tentando ClipboardItem:",
      e,
    );
  }

  // Fallback: ClipboardItem (sem garantia de cores em todos os browsers)
  await navigator.clipboard.write([
    new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
    }),
  ]);
}

interface CopyTableButtonProps {
  // operadores e supervisor continuam aceitos (o caller os passa), mas o texto
  // copiado não os usa mais — agora é só título + hora do report + imagem.
  operadores: OperadorConsolidado[];
  equipe: ResumoEquipe;
  supervisor?: string;
  /** Nome do supervisor que fez o último report (BASE - 1!S2, junto com a hora). */
  nomeSupervisorReport?: string | null;
}

export function CopyTableButton({ equipe, nomeSupervisorReport }: CopyTableButtonProps) {
  const [state, setState] = useState<"idle" | "copying" | "done">("idle");

  async function handleCopy() {
    const target = document.querySelector<HTMLElement>("[data-tabela-png]");

    if (!target) {
      toast.error("Tabela não encontrada");
      return;
    }

    setState("copying");

    try {
      const pngDataUrl = await domToPng(target, { scale: 3 });
      const hora = getHoraReport(equipe);
      const html = formatReportHtml(hora, nomeSupervisorReport, pngDataUrl);

      await copyFormattedHtml(html);

      setState("done");
      toast.success("Tabela copiada", {
        description: "Cole no Teams, Slack ou email (Ctrl+V)",
        duration: 2500,
      });

      setTimeout(() => setState("idle"), 2000);
    } catch (err) {
      console.error("[copy-table] erro:", err);
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
          <IconLoader2
            size={14}
            className="animate-spin"
            aria-hidden="true"
          />
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
