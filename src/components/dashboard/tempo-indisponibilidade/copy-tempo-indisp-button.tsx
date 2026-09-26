"use client";

import { useState } from "react";
import { IconCamera, IconCheck, IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";

import { buildClipboardReportHtml } from "@/lib/gestor/build-clipboard-report-html";
import { capturarComoPng } from "@/lib/utils/capturar-como-png";
import { copyFormattedHtml, escapeHtml } from "@/lib/utils/copy-formatted-html";
import { cn } from "@/lib/utils";

interface CopyTempoIndispButtonProps {
  horaReport: string;
}

/**
 * Botão único "Copiar imagem" da seção Tempo Logado & Indisponibilidade —
 * substitui os dois botões antigos (um por tabela). MESMO rótulo/ícone/
 * estados/visual (outline h-8, min-w-[140px]) do CopyTableButton do
 * consolidado — antes era um botão cheio (bg-primary) com o texto "Copiar
 * como imagem". Captura o wrapper offscreen único ([data-tempo-indisp-png]),
 * que já força o nome fantasia (não recebe olhoAberto) — ver comentário em
 * tempo-indisp-section.tsx.
 */
export function CopyTempoIndispButton({ horaReport }: CopyTempoIndispButtonProps) {
  const [state, setState] = useState<"idle" | "copying" | "done">("idle");

  async function handleCopy() {
    const target = document.querySelector<HTMLElement>("[data-tempo-indisp-png]");
    if (!target) {
      toast.error("Tabela não encontrada", { className: "reports-tempo-indisp-toast" });
      return;
    }

    setState("copying");

    try {
      // corDeFundoDoAlvo: true — mesma correção do CopyTableButton do
      // consolidado: sem isso, a margem ao redor da tabela sai com o
      // --background do tema GLOBAL (cinza-claro) em vez do bege Zen Linen
      // escopado a [data-page="reports-tempo-indisponibilidade"], porque o
      // alvo ([data-tempo-indisp-png]) fica dentro de um wrapper
      // `position: fixed` que a lib clona isoladamente.
      const pngDataUrl = await capturarComoPng(target, { corDeFundoDoAlvo: true });
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
        className: "reports-tempo-indisp-toast",
      });
      setTimeout(() => setState("idle"), 2000);
    } catch (err) {
      console.error("[copy-tempo-indisp] erro:", err);
      setState("idle");
      toast.error("Não foi possível copiar", {
        description: "Tente em outro navegador (Chrome/Edge)",
        className: "reports-tempo-indisp-toast",
      });
    }
  }

  return (
    // Mesma família visual do CopyTableButton do consolidado: botão outline
    // h-8, min-w fixo (cabe "Copiar imagem") — troca de ícone/texto entre
    // estados não desloca o layout ao redor.
    <button
      type="button"
      onClick={handleCopy}
      disabled={state === "copying"}
      className={cn(
        "font-sans border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 inline-flex h-8 min-w-[140px] items-center justify-center gap-1.5 rounded-md border bg-transparent px-3 text-sm font-medium outline-none transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)]",
      )}
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
