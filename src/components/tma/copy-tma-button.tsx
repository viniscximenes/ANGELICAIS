"use client";

import { useState } from "react";
import { IconCamera, IconCheck, IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";

import { capturarComoPng } from "@/lib/utils/capturar-como-png";
import { copyFormattedHtml, escapeHtml } from "@/lib/utils/copy-formatted-html";

/**
 * HTML colado — MESMA estrutura do formatReportHtml do Consolidado
 * (copy-table-button.tsx): título <h2><b> → "report às" <div><i> → imagem.
 * Cor do texto FIXA (#1E1E1E) repetida no nó que carrega o texto: o HTML é
 * colado fora do site (Teams/Slack/email), sempre em fundo claro — sem cor
 * própria, o texto herdava a cor do tema do dashboard (escuro → branco) e
 * saía ilegível. Montado aqui (não em buildClipboardReportHtml, compartilhado
 * com outras rotas) pra não mexer nas demais.
 */
function formatReportHtml(hora: string, pngDataUrl: string): string {
  const TITULO_COR = "color: #1E1E1E;";
  const parts: string[] = [
    `<h2 style="font-size: 16px; margin: 0; ${TITULO_COR}"><b style="${TITULO_COR}">TMA</b></h2>`,
    `<div style="margin-top: 4px; ${TITULO_COR}"><i style="${TITULO_COR}">report às ${escapeHtml(hora)}</i></div>`,
    `<br>`,
    `<div style="margin-top: 8px;"><img src="${pngDataUrl}" style="display: block; max-width: 1000px; width: 100%;" alt="Tabela TMA"></div>`,
  ];
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1E1E1E;">${parts.join("")}</div>`;
}

interface CopyTmaButtonProps {
  horaReport: string;
}

export function CopyTmaButton({ horaReport }: CopyTmaButtonProps) {
  const [state, setState] = useState<"idle" | "copying" | "done">("idle");

  async function handleCopy() {
    const target = document.querySelector<HTMLElement>("[data-tma-png]");
    if (!target) {
      toast.error("Tabela não encontrada", { className: "toast-padrao" });
      return;
    }

    setState("copying");

    try {
      const pngDataUrl = await capturarComoPng(target, { corDeFundoDoAlvo: true });
      const hora =
        horaReport && horaReport !== "—"
          ? horaReport.match(/^(\d{1,2}:\d{2})/)?.[1] ?? horaReport
          : "—";
      const html = formatReportHtml(hora, pngDataUrl);

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
        className: "toast-padrao",
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
