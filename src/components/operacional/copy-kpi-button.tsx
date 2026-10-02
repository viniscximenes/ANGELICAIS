"use client";

import { useState } from "react";
import { IconCamera, IconCheck, IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  buildKpiClipboardHtml,
  buildKpiClipboardTextoPlano,
  tituloComData,
} from "@/app/(dashboard)/s/kpi/operadores/_lib/build-copy-html";

/**
 * Cópia local (não a shared src/lib/utils/copy-formatted-html.ts, NÃO
 * alterada) — só pra poder incluir também um Blob "text/plain" no fallback
 * ClipboardItem (a versão compartilhada só escreve "text/html"). O caminho
 * execCommand não precisa de nada extra: o navegador já sintetiza um
 * text/plain a partir da seleção automaticamente.
 */
async function copyFormattedHtml(html: string, textoPlano: string): Promise<void> {
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

  // Fallback: ClipboardItem (sem garantia de cores em todos os browsers) —
  // com text/plain junto, pra colar em campos que só aceitam texto puro.
  await navigator.clipboard.write([
    new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([textoPlano], { type: "text/plain" }),
    }),
  ]);
}

interface CopyKpiButtonProps {
  /** Data de corte dos dados (mesRef não tem precisão de dia) — vira o sufixo "- dd/mm" do título. */
  dataCorte: string | null;
  /** true = inclui o aviso de RV no conteúdo copiado (somente quando "Total (RV)" está efetivamente visível). */
  comAvisoRv: boolean;
  /**
   * Monta a instância offscreen (data-kpi-tabela-png), aguarda fontes +
   * frames e retorna o PNG capturado, desmontando a instância em seguida
   * (inclusive em erro) — implementado no componente pai
   * (kpi-equipe-section.tsx), que é quem controla essa instância. Este
   * botão não guarda mais nenhuma referência direta ao DOM da tabela.
   */
  onCapturar: () => Promise<string>;
  /** Título do bloco copiado (mesmo texto vira "- dd/mm" via tituloComData). Default = comportamento original ("TABELA DO KPI", usado em /kpi/operadores). */
  titulo?: string;
  /** Alt text da imagem no HTML copiado. Default = comportamento original. */
  altText?: string;
}

/**
 * Copia a tabela de KPI (offscreen, [data-kpi-tabela-png]) como imagem —
 * mesmo mecanismo e mesmo padrão visual de CopyTableButton (D-1
 * Consolidado) / CopyTempoLogadoButton / CopyIndisponibilidadeButton:
 * título + subtítulo como TEXTO, a imagem capturada é só a tabela (sem
 * título embutido nela). O HTML é montado em _lib/build-copy-html.ts
 * (réplica do formato de buildClipboardReportHtml, que não aceita conteúdo
 * extra como o aviso de RV — ver comentário lá).
 */
export function CopyKpiButton({
  dataCorte,
  comAvisoRv,
  onCapturar,
  titulo: tituloBase = "TABELA DO KPI",
  altText = "Tabela do KPI",
}: CopyKpiButtonProps) {
  const [state, setState] = useState<"idle" | "copying" | "done">("idle");

  async function handleCopy() {
    setState("copying");

    try {
      const pngDataUrl = await onCapturar();

      const titulo = tituloComData(tituloBase, dataCorte);

      const html = buildKpiClipboardHtml({
        titulo,
        pngDataUrl,
        altText,
        comAvisoRv,
      });
      const textoPlano = buildKpiClipboardTextoPlano(titulo, comAvisoRv);

      await copyFormattedHtml(html, textoPlano);

      // Sem toast de sucesso: o próprio botão confirma a cópia por 2s,
      // seguindo o mesmo padrão de /s/reports/consolidado.
      setState("done");

      setTimeout(() => setState("idle"), 2000);
    } catch (err) {
      console.error("[copy-kpi] erro:", err);
      setState("idle");
      toast.error("Não foi possível copiar", {
        description: "Tente em outro navegador (Chrome/Edge)",
        className: "kpi-op-toast",
      });
    }
  }

  return (
    // min-w fixo (cabe o rótulo mais longo, "Copiar imagem") + justify-center
    // — troca de ícone/texto entre estados não desloca o layout ao redor.
    // h-8 pra bater com a altura do seletor de mês/bloco RV na mesma linha.
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
          <span>Copiado!</span>
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
