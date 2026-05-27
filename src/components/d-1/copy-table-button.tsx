"use client";

import { useState } from "react";
import { IconCamera, IconCheck, IconLoader2 } from "@tabler/icons-react";
import { domToPng } from "modern-screenshot";
import { toast } from "sonner";

import type { OperadorConsolidado, ResumoEquipe } from "@/lib/google/d1";

const META_TX = 0.6;

function formatTxBR(percent: number): string {
  return percent.toFixed(2).replace(".", ",");
}

function meetsMeta(tx: number): boolean {
  return Math.round(tx * 1000) >= Math.round(META_TX * 1000);
}

function usernameFromEmail(email: string): string {
  return email.split("@")[0] || email;
}

type ReportSections = {
  hora: string;
  tail:
    | { kind: "urgent"; ops: Array<{ name: string; txPercent: number }> }
    | { kind: "celebration" }
    | { kind: "none" };
};

function buildReportSections(
  operadores: OperadorConsolidado[],
  equipe: ResumoEquipe,
): ReportSections {
  const hora =
    equipe.horaReport && equipe.horaReport !== "—" ? equipe.horaReport : "—";

  const withAtendimentos = operadores.filter(
    (op) => op.pedidos > 0 && op.txRetencao !== null,
  );

  // Abaixo da meta, ordenados do mais crítico (menor TX) pro maior
  const belowMeta = withAtendimentos
    .filter((op) => !meetsMeta(op.txRetencao!))
    .sort((a, b) => a.txRetencao! - b.txRetencao!);

  if (belowMeta.length > 0) {
    return {
      hora,
      tail: {
        kind: "urgent",
        ops: belowMeta.map((op) => ({
          name: usernameFromEmail(op.email),
          txPercent: (op.txRetencao as number) * 100,
        })),
      },
    };
  }
  if (withAtendimentos.length > 0) {
    return { hora, tail: { kind: "celebration" } };
  }
  return { hora, tail: { kind: "none" } };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatReportHtml(s: ReportSections, pngDataUrl: string): string {
  const parts: string[] = [
    `<h2 style="font-size: 22px; margin: 0;"><b>CONSOLIDADO / EVOLUÇÃO POR TAXA:</b></h2>`,
    `<sub style="font-size: 10px;"><font size="1">REPORT DAS </font></sub> <font size="3"><i>${escapeHtml(s.hora)}</i></font>`,
    `<br><br>`,
    `<img src="${pngDataUrl}" style="max-width:1000px; width:100%;" alt="Tabela consolidado">`,
    `<br><br>`,
  ];
  if (s.tail.kind === "urgent") {
    const ops = s.tail.ops;
    parts.push(
      `<b>AJUDA AOS OPERADORES ABAIXO DOS 60%</b><br>`,
      ops
        .map(
          (o, i) =>
            `• ${escapeHtml(o.name.toUpperCase())} - TAXA ${formatTxBR(o.txPercent)}%${i < ops.length - 1 ? "<br>" : ""}`,
        )
        .join(""),
    );
  } else if (s.tail.kind === "celebration") {
    parts.push(`<b>EQUIPE TODA ACIMA DA META</b>`);
  }
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
  operadores: OperadorConsolidado[];
  equipe: ResumoEquipe;
}

export function CopyTableButton({
  operadores,
  equipe,
}: CopyTableButtonProps) {
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
      const sections = buildReportSections(operadores, equipe);
      const html = formatReportHtml(sections, pngDataUrl);

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
