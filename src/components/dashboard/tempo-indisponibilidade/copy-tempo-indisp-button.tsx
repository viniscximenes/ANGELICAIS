"use client";

import { useState } from "react";
import { IconCamera, IconCheck, IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";

import { capturarComoPng } from "@/lib/utils/capturar-como-png";
import { copyFormattedHtml, escapeHtml } from "@/lib/utils/copy-formatted-html";
import { cn } from "@/lib/utils";

/**
 * HTML colado — MESMO formato de formatReportHtml em copy-table-button.tsx
 * (consolidado): título <h2><b> → report <div><i> → imagem. Cor do texto
 * FIXA (#1E1E1E), repetida no <b>/<i>: o HTML é colado fora do site
 * (Teams/Slack/email, fundo claro) e, sem cor própria, herdava a cor do tema
 * da página de origem (escuro → texto branco, ilegível no destino). O
 * builder compartilhado (buildClipboardReportHtml) não fixa cor — por isso
 * montado aqui, sem mexer nele (usado por outras páginas).
 */
function formatReportHtml(hora: string, pngDataUrl: string): string {
  const TITULO_COR = "color: #1E1E1E;";
  const parts: string[] = [
    `<h2 style="font-size: 16px; margin: 0; ${TITULO_COR}"><b style="${TITULO_COR}">D-1 TEMPO LOGADO &amp; INDISPONIBILIDADE</b></h2>`,
    `<div style="margin-top: 4px; ${TITULO_COR}"><i style="${TITULO_COR}">report às ${escapeHtml(hora)}</i></div>`,
    `<br>`,
    `<div style="margin-top: 8px;"><img src="${pngDataUrl}" style="display: block; max-width: 1000px; width: 100%;" alt="Tabela tempo logado e indisponibilidade"></div>`,
  ];
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1E1E1E;">${parts.join("")}</div>`;
}

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
      toast.error("Tabela não encontrada", { className: "toast-padrao" });
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
      const html = formatReportHtml(hora, pngDataUrl);

      await copyFormattedHtml(html);

      // O próprio botão muda para "Copiado" por 2s, seguindo o mesmo
      // feedback visual do Consolidado sem exibir um popup adicional.
      setState("done");
      setTimeout(() => setState("idle"), 2000);
    } catch (err) {
      console.error("[copy-tempo-indisp] erro:", err);
      setState("idle");
      toast.error("Não foi possível copiar", {
        description: "Tente em outro navegador (Chrome/Edge)",
        className: "toast-padrao",
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
